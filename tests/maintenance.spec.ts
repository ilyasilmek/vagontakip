import ExcelJS from 'exceljs';
import { test, expect } from '@playwright/test';
import { apiContext, credentials, login, loginThroughPage, uniqueName, expectNoHorizontalOverflow } from './helpers';

test.use({serviceWorkers:'block'});

test.skip(process.env.E2E_MAINTENANCE !== 'true', 'Requires the isolated maintenance Worker; never run against production.');

test('records the agreed workload, persists edits, exports reports and separates repeat visits', async ({page,playwright})=>{
 const admin=await apiContext(playwright);const created:string[]=[];
 try {
  await login(admin,await credentials());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await loginThroughPage(page,await credentials());
  await page.getByRole('navigation',{name:'Mobil gezinme'}).getByRole('button',{name:'Bakım',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Bakım operasyonları',exact:true})).toBeVisible();await expectNoHorizontalOverflow(page);
  await page.getByRole('button',{name:'Bakım ekle',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Yeni bakım operasyonu'});const wagon=uniqueName('maintenance');const day=new Date().toISOString().slice(0,10);
  await dialog.getByLabel('Vagon numarası',{exact:true}).fill(wagon);await dialog.getByLabel('Başlangıç tarih ve saati').fill(day+'T09:00');await dialog.getByLabel('Bitiş tarih ve saati').fill(day+'T11:00');await dialog.getByLabel('Vardiya amiri',{exact:true}).fill('Test Amir');
  await expect(dialog.getByLabel('Atanan personel sayısı')).toHaveValue('3');
  await expect(dialog.getByRole('checkbox')).toHaveCount(49);
  for(const name of [/^Ağır bakım & Yürüyüş/,/^Akerman sök-tak/,/^Sızdırmazlık testi/,/^Hazırlık & Güvenlik/]) await dialog.getByRole('checkbox',{name}).check();
  await dialog.getByRole('button',{name:'Seçilenler (4)',exact:true}).click();
  await expect(dialog.getByRole('checkbox')).toHaveCount(4);
  await dialog.getByRole('button',{name:'Akerman sök-tak adedini artır',exact:true}).click();
  await expect(dialog.getByLabel('Akerman sök-tak adedi',{exact:true})).toHaveValue('2');
  await dialog.getByRole('button',{name:'Akerman sök-tak adedini azalt',exact:true}).click();
  await expect(dialog.getByLabel('Akerman sök-tak adedi',{exact:true})).toHaveValue('1');
  await dialog.getByRole('button',{name:'Akerman sök-tak adedini artır',exact:true}).click();
  const jobLayout=await dialog.locator('.job-check').first().evaluate(label=>{const box=label.querySelector('input')!.getBoundingClientRect(),text=label.querySelector('span')!.getBoundingClientRect();return {inline:box.right<=text.left,height:box.height};});
  expect(jobLayout.inline).toBe(true);expect(jobLayout.height).toBeLessThan(30);
  await dialog.getByLabel('İş kalemi ara',{exact:true}).fill('Akerman');await expect(dialog.getByRole('checkbox')).toHaveCount(1);
  await dialog.getByLabel('İş kalemi ara',{exact:true}).fill('');await expect(dialog.getByRole('checkbox')).toHaveCount(4);
  await dialog.getByRole('button',{name:'Tüm işler (49)',exact:true}).click();await expect(dialog.getByRole('checkbox')).toHaveCount(49);
  await dialog.getByRole('button',{name:'Bekleme ekle',exact:true}).click();await dialog.getByLabel('Bekleme sebebi').selectOption('Malzeme/Valf Tedarik');await dialog.getByLabel('Bekleme süresi (dakika)').fill('30');
  await expect(dialog.getByRole('status')).toContainText('3,75 A/S');await expect(dialog.getByRole('status')).toContainText('75 dakika');await expectNoHorizontalOverflow(page);
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/maintenance')&&r.request().method()==='POST');await dialog.getByRole('button',{name:'Kaydet',exact:true}).click();const response=await responsePromise;expect(response.status()).toBe(201);
  const payload=response.request().postDataJSON();const saved=await response.json();created.push(saved.operation.id);
  await expect(dialog).toHaveCount(0);await page.reload();await expect(page.getByRole('heading',{name:'Bakım operasyonları',exact:true})).toBeVisible();
  await page.getByRole('button',{name:new RegExp(wagon)}).click();const details=page.getByRole('dialog',{name:'Bakım operasyonu',exact:true});
  await expect(details).toContainText('3,75 A/S');await expect(details).toContainText('1,5 A/S');await expect(details).toContainText('83,33 / 62,5 %');await expect(details).toContainText('tahminen 75 dakikada');
  await page.emulateMedia({media:'print'});await expect(page.locator('.maintenance-report')).toBeVisible();await expect(page.locator('.topbar')).toBeHidden();const pdf=await page.pdf({format:'A4',printBackground:true});expect(pdf.subarray(0,4).toString()).toBe('%PDF');expect(pdf.length).toBeGreaterThan(5000);await page.emulateMedia({media:'screen'});
  await page.goBack();await expect(details).toHaveCount(0);await expect(page.getByRole('heading',{name:'Bakım operasyonları',exact:true})).toBeVisible();
  // An open page must export even when a later deployment removes its old Excel asset.
  await page.route(/\/assets\/exceljs[^/]*\.js$/,route=>route.abort());
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Aylık Excel raporu',exact:true}).click();const download=await downloadPromise;const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile((await download.path())!);expect(workbook.worksheets.map(s=>s.name)).toEqual(['Aylık özet','Bakım operasyonları','Yapılan işler','Beklemeler']);expect(workbook.getWorksheet('Aylık özet')!.getCell('B4').value).toBe(3.75);
  await page.unroute(/\/assets\/exceljs[^/]*\.js$/);
  const second=await admin.post('/api/maintenance',{data:payload});expect(second.status()).toBe(201);created.push((await second.json()).operation.id);
  await page.getByRole('button',{name:'Yenile',exact:true}).click();await expect(page.locator('.maintenance-row')).toHaveCount(2);await expect(page.locator('.maintenance-metric').filter({hasText:'Benzersiz vagon'})).toContainText('1');
  await page.locator('.maintenance-row').first().click();await page.getByRole('dialog').getByRole('button',{name:'Düzenle',exact:true}).click();await page.getByRole('dialog').getByLabel('Açıklama',{exact:true}).fill('Updated test notes');await page.getByRole('dialog').getByRole('button',{name:'Kaydet',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();await page.locator('.maintenance-row').first().click();await expect(page.getByRole('dialog')).toContainText('Updated test notes');await expectNoHorizontalOverflow(page);
 } finally {
  const response=await admin.get('/api/maintenance');if(response.ok()){const body=await response.json();for(const id of created){const o=body.operations.find((o:{id:string})=>o.id===id);if(o)expect((await admin.delete(`/api/maintenance/${id}`,{data:{revision:o.revision}})).status()).toBe(200);}}
  await admin.dispose();
 }
});

test('starts maintenance from wagon details, prefills its number and returns to the wagon', async ({page,playwright})=>{
 const admin=await apiContext(playwright);const wagon=uniqueName('linkedwagon');let wagonId='';let operationId='';
 try {
  await login(admin,await credentials());
  const response=await admin.post('/api/wagons',{data:{number:wagon,wagonType:'Sgss-w',status:'Bekliyor',entryDate:'2026-10-07',channelDate:'',completedDate:'',notes:''}});
  expect(response.status()).toBe(201);wagonId=(await response.json()).record.id;
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await loginThroughPage(page,await credentials());
  await page.getByRole('navigation',{name:'Mobil gezinme'}).getByRole('button',{name:'Vagonlar',exact:true}).click();
  await page.getByRole('textbox',{name:'Vagonlar içinde ara'}).fill(wagon);await page.getByRole('button',{name:`Vagon ${wagon} ayrıntıları`,exact:true}).click();
  const details=page.getByRole('dialog',{name:'Vagon ayrıntıları',exact:true});
  await details.getByRole('button',{name:'Bakım ekle',exact:true}).click();
  const form=page.getByRole('dialog',{name:'Yeni bakım operasyonu',exact:true});
  await expect(form.getByLabel('Vagon numarası',{exact:true})).toHaveValue(wagon);
  await page.goBack();await expect(form).toHaveCount(0);await expect(details).toBeVisible();
  await details.getByRole('button',{name:'Bakım ekle',exact:true}).click();
  await expect(form).toBeVisible();await page.keyboard.press('Escape');await expect(form).toHaveCount(0);await expect(details).toBeVisible();
  await details.getByRole('button',{name:'Bakım ekle',exact:true}).click();
  const day=new Date().toISOString().slice(0,10);
  await form.getByLabel('Başlangıç tarih ve saati').fill(day+'T09:00');await form.getByLabel('Bitiş tarih ve saati').fill(day+'T11:00');
  await form.getByRole('combobox',{name:'Vardiya',exact:true}).selectOption('2. Vardiya');await form.getByLabel('Vardiya amiri',{exact:true}).fill('Test Amir');
  await form.getByRole('checkbox',{name:/^Sabo sök-tak/}).check();await expectNoHorizontalOverflow(page);
  const saved=page.waitForResponse(r=>r.url().endsWith('/api/maintenance')&&r.request().method()==='POST');await form.getByRole('button',{name:'Kaydet',exact:true}).click();
  const result=await saved;expect(result.status()).toBe(201);const operation=(await result.json()).operation;operationId=operation.id;expect(operation.wagonNumber).toBe(wagon);expect(operation.shift).toBe('2. Vardiya');
  await expect(form).toHaveCount(0);await expect(details).toBeVisible();await details.getByRole('button',{name:'Kapat',exact:true}).click();
  await page.getByRole('navigation',{name:'Mobil gezinme'}).getByRole('button',{name:'Bakım',exact:true}).click();await expect(page.getByRole('button',{name:new RegExp(wagon)})).toBeVisible();
 }finally{
  if(operationId){const listing=await (await admin.get('/api/maintenance')).json();const o=listing.operations.find((r:{id:string})=>r.id===operationId);if(o)expect((await admin.delete('/api/maintenance/'+operationId,{data:{revision:o.revision}})).status()).toBe(200);}
  if(wagonId){const data=await (await admin.get('/api/data')).json();const w=data.wagons.find((r:{id:string})=>r.id===wagonId);if(w)expect((await admin.delete('/api/wagons/'+wagonId,{data:{revision:w.revision}})).status()).toBe(200);}
  await admin.dispose();
 }
});
