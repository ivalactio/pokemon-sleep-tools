import puppeteer from 'puppeteer';

(async () => {
  console.log("Starting Puppeteer Audit...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const results = {
    navigation: [],
    collection: [],
    importExport: [],
    errors: []
  };

  const log = (category, msg, success = true) => {
    results[category].push({ msg, success });
    console.log(`[${category}] ${success ? '✅' : '❌'} ${msg}`);
  }

  try {
    // 1. Navigation & UI
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForSelector('text/Dashboard');
    log('navigation', 'Dashboard loads correctly');

    await page.click('text/Colección');
    await page.waitForSelector('text/No tienes Pokémon en tu colección');
    log('navigation', 'Collection page loads with empty state');

    await page.click('text/Recetas');
    await page.waitForSelector('text/Catálogo de Recetas');
    log('navigation', 'Recipes page loads');

    // 2. Collection CRUD
    await page.click('text/Colección');
    await page.waitForSelector('text/Añadir Pokémon');
    await page.click('text/Añadir Pokémon');
    await page.waitForSelector('text/Guardar');
    log('collection', 'Add Pokemon form loads');

    // Submit empty form to trigger Zod validation
    await page.click('text/Guardar');
    await page.waitForSelector('text/Especie es requerida');
    log('collection', 'Zod validation prevents empty submission');

    // Fill valid data
    await page.type('input[name="speciesId"]', 'PIKACHU');
    await page.type('input[name="nickname"]', 'Sparky');
    await page.type('input[name="natureId"]', 'Brave');
    await page.click('text/Guardar');
    
    // Should navigate back to collection list
    await page.waitForSelector('text/Sparky');
    log('collection', 'Pokemon created and displayed in list');

    // Check persistence
    await page.reload();
    await page.waitForSelector('text/Sparky');
    log('collection', 'Pokemon persists after reload (IndexedDB)');

    // Click details
    await page.click('text/Sparky');
    await page.waitForSelector('text/Nivel 1');
    log('collection', 'Pokemon details page loads');

    // Delete
    // Handle dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    // Click trash icon (it's the only button with a lucide-react Trash2 icon, but let's select by css)
    await page.click('button.text-red-500');
    
    await page.waitForSelector('text/No tienes Pokémon en tu colección');
    log('collection', 'Pokemon deleted successfully');

    // 3. Import/Export
    // We navigate back to dashboard
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForSelector('text/Exportar JSON');
    log('importExport', 'Export/Import buttons present on dashboard');
    
    // We can't easily test file dialog in puppeteer without more setup, so we will manually report that the DOM elements are there.
    // The input[type=file] is there.
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      log('importExport', 'File input present for JSON import');
    }

  } catch (e) {
    console.error(e);
    results.errors.push(e.message);
  } finally {
    await browser.close();
    
    import('fs').then(fs => {
      fs.writeFileSync('./scratch/puppeteer-report.json', JSON.stringify(results, null, 2));
      console.log("Wrote scratch/puppeteer-report.json");
    });
  }
})();
