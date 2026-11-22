import pathlib
import subprocess
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]

class PresentationRegressionTest(unittest.TestCase):
    def test_decimal_rate_five_strategy_years_and_exact_source(self):
        script=r'''
const fs=require('fs'),vm=require('vm');
const data=JSON.parse(fs.readFileSync('data/official-snapshot.json','utf8'));
const source=fs.readFileSync('src/main.js','utf8')
  .replace(/^import .*\n/gm,'').replace(/\nrender\(\);\s*$/,'');
const check=`
  state.step=2;
  if(!body().includes('value="1.5"')) throw Error('decimal rate is rounded');
  state.step=6;state.plan='year7';state.withdrawalYear=7;
  const year7=body();
  if(!year7.includes('第7年起領 6.5%') || !year7.includes('data-withdraw-year="7"') || year7.includes('data-withdraw-year="6"'))
    throw Error('year7 rail must begin at first eligible withdrawal year');
  if(!year7.includes('32,500'))throw Error('year7 start cashflow is incorrect');
  state.withdrawalYear=8;const year8=body();
  if(!year8.includes('65,000'))throw Error('year8 cumulative withdrawal is incorrect');
  state.plan='year11';state.withdrawalYear=11;
  if(body().includes('data-withdraw-year="10"'))throw Error('year11 rail must not show earlier years');
  state.plan='rollover';state.withdrawalYear=5;
  if(!body().includes('HK$ 0'))throw Error('rollover must have zero cash withdrawal');
  state.step=5;state.plan='year5';state.term=6;
  if(body().includes('無此年度數據'))throw Error('sourced exact year6 missing');
  state.term=21;if(!body().includes('—'))throw Error('unsupported policy year must not be interpolated');
`;
vm.runInNewContext(source+check,{bundledData:data,document:{},window:{},URLSearchParams});
'''
        subprocess.run(['node','-e',script],cwd=ROOT,check=True)
