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
  .replace(/^import .*\n/gm, '').replace(/\nrender\(\);\s*$/, '');
vm.runInNewContext(source + `
  if (entryMode('?avaEntry=frontend') !== 'frontend' || entryMode('?avaEntry=admin') !== 'admin' || entryMode('?avaEntry=user') !== 'user' || entryMode('?avaEntry=frontend&avaEntry=admin') !== 'admin') throw Error('unsafe entry routing');
  if (!validLegacyUserData({introNote:'one',summaryNote:'two'})) throw Error('legacy notes rejected');
  const migrated=migrateUserData({introNote:'one',summaryNote:'two'});
  if (!validUserData(migrated) || migrated.introNote!=='one' || migrated.titles.length!==7) throw Error('legacy migration failed');
  if (validUserData({...migrated,official:1}) || validUserData({...migrated,titles:['x']})) throw Error('invalid v2 accepted');
  if (validUserData({introNote:'one',summaryNote:'two',official:1}) || validUserData({introNote:'x'.repeat(2001),summaryNote:''})) throw Error('unsafe note accepted');
  if (escapeText('<img onerror=alert(1)>').includes('<')) throw Error('markup not escaped');
  if (!validateSnapshot(data)) throw Error('valid snapshot rejected');
  const broken = JSON.parse(JSON.stringify(data)); broken.plans[0].balances[0][1] = -1;
  if (validateSnapshot(broken)) throw Error('invalid multiplier accepted');
  broken.plans[0].balances[0][1] = 1; broken.plans[0].balances[1][0] = broken.plans[0].balances[0][0];
  if (validateSnapshot(broken)) throw Error('duplicate year accepted');
  state.plan = 'year1'; state.capital = 500000; state.term = 5; state.step = 4;
  const view = body();
  if (!view.includes('396,635') || view.includes('data-year="6"')) throw Error('incorrect exact-year projection');
  state.step=5; state.term=6; const compare=body(); if(!compare.includes('未有數據') || !compare.includes('615,000')) throw Error('exact-year comparison incorrect'); if(!compare.includes('正式條款未核實')) throw Error('missing unsupported cash-flow disclosure'); state.step=4;
  state.term = 6; if (!body().includes('無此年度數據')) throw Error('missing year must stay unavailable');
  state.goals = [1]; state.bankRate = 1.5; state.bankYears = 10; state.step = 6;
  if (!body().includes('客人關注：提取現金流')) throw Error('goal missing from summary');
  if (!body().includes('1.5%') || !body().includes('10 年')) throw Error('bank assumptions missing from summary');
`, {bundledData:data, document: {}, window: {}, URLSearchParams});
'''
        subprocess.run(['node', '-e', script], cwd=ROOT, check=True)


if __name__ == '__main__':
    unittest.main()
