
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('http://localhost:5173');
        await page.waitForTimeout(1000);

        console.log('1. Select Map Coloring');
        await page.selectOption('select.w-full.bg-slate-700', 'map-coloring');
        await page.waitForTimeout(500);

        console.log('2. Select Backtracking Algorithm');
        // The algorithm select is the second select on the page (index 1) if we select by class
        // Use more specific selector if possible due to multiple selects
        const selects = await page.$$('select');
        for (const s of selects) {
            const options = await s.$$eval('option', ops => ops.map(o => o.value));
            if (options.includes('backtracking')) {
                await s.selectOption('backtracking');
                break;
            }
        }
        await page.waitForTimeout(500);

        console.log('3. Select Degree Heuristic');
        // Find the Variable Selection dropdown (it has 'degree' option)
        let varHeuristicSelect = null;
        for (const s of selects) {
            const options = await s.$$eval('option', ops => ops.map(o => o.value));
            if (options.includes('degree')) {
                varHeuristicSelect = s;
                break;
            }
        }

        // Use text content to find label if select inspection fails, but let's try direct select first
        // Refetch selects as the DOM might have changed
        const newSelects = await page.$$('select');
        for (const s of newSelects) {
            const options = await s.$$eval('option', ops => ops.map(o => o.value));
            if (options.includes('degree')) {
                await s.selectOption('degree');
                console.log('   - Selected Degree Heuristic');
                break;
            }
        }

        console.log('4. Run one step');
        await page.click('button:has-text("Step")');
        await page.waitForTimeout(500);

        console.log('5. Verify SA (South Australia) is selected');
        // We need to check the state. The coloring board invalidates this a bit visually, 
        // but we can check the logs or the internal state if we exposed it.
        // Or visually: SA is the big central state.
        // Let's take a screenshot for visual confirmation.
        await page.screenshot({ path: '/Users/arya/.gemini/antigravity/brain/8a7e649f-75d6-43f3-bbec-2fee26968bd5/verify_degree_sa.png' });

        console.log('6. Verify Backtracking with LCV');
        // Find value ordering dropdown (has 'lcv')
        for (const s of newSelects) {
            const options = await s.$$eval('option', ops => ops.map(o => o.value));
            if (options.includes('lcv')) {
                await s.selectOption('lcv');
                console.log('   - Selected LCV Value Ordering');
                break;
            }
        }

        // Reset and Run
        await page.click('button:has-text("Reset")');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Start")');
        await page.waitForTimeout(2000); // Let it run
        await page.screenshot({ path: '/Users/arya/.gemini/antigravity/brain/8a7e649f-75d6-43f3-bbec-2fee26968bd5/verify_backtrack_lcv.png' });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
