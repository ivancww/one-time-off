import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class PresentationRegressionTest(unittest.TestCase):
    def test_decimal_rate_and_unverified_start_years(self):
        script = r'''
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const data = JSON.parse(fs.readFileSync('data/official-snapshot.json', 'utf8'));
const source = fs.readFileSync('src/main.js', 'utf8')
  .replace(/^import .*\n/gm, '').replace(/\nrender\(\);\s*$/, '');
const check = `
  state.step = 2;
  if (!body().includes('value="1.5"')) throw Error('decimal rate is rounded');
  for (const step of [3, 5, 6]) {
    state.step = step;
    for (const p of data.plans.filter(p => p.id !== 'rollover')) {
      if (body().includes(p.label)) throw Error('unverified start year shown');
    }
  }
  state.step = 4; state.plan = 'year1'; state.term = 6;
  if (!body().includes('無此年度數據')) throw Error('unsupported year invented');
`;
vm.runInNewContext(source + check, {bundledData:data, document: {}, window: {}});
'''
        subprocess.run(["node", "-e", script], cwd=ROOT, check=True)


if __name__ == "__main__":
    unittest.main()
