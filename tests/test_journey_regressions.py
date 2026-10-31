import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class JourneyRegressionTest(unittest.TestCase):
    def test_projection_uses_only_available_years_and_summary_retains_goals(self):
        script = r'''
const fs = require('fs'), vm = require('vm');
const data = JSON.parse(fs.readFileSync('data/official-snapshot.json', 'utf8'));
const source = fs.readFileSync('src/main.js', 'utf8')
  .replace(/^import .*\n/, '').replace(/\nrender\(\);\s*$/, '');
vm.runInNewContext(source + `
  state.plan = 'year1'; state.capital = 500000; state.step = 4;
  const chart = projectionChart(plan(state.plan));
  if (!chart.includes('396,635')) throw Error('incorrect chart amount');
  if (chart.includes('>6 年<')) throw Error('chart invented missing year');
  state.goals = [1]; state.bankRate = 1.5; state.step = 6;
  if (!body().includes('客人關注：提取現金流')) throw Error('goal missing from summary');
  if (!body().includes('1.5%')) throw Error('bank assumption missing from summary');
`, {data, document: {}, window: {}});
'''
        subprocess.run(['node', '-e', script], cwd=ROOT, check=True)


if __name__ == '__main__':
    unittest.main()
