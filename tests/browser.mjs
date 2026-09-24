// One way to start the test browser, wherever the checks run: the cloud box has Chromium at a fixed path,
// a laptop uses the one Playwright installed for itself.
import { chromium } from 'playwright';
import fs from 'node:fs';
const CLOUD = '/opt/pw-browsers/chromium';
export const launch = (extra = []) => chromium.launch({
  ...(fs.existsSync(CLOUD) ? { executablePath: CLOUD } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...extra],
});
export { chromium };
