import json
import pathlib
import unittest
from decimal import Decimal

ROOT=pathlib.Path(__file__).resolve().parents[1]

class BalanceCalculationTest(unittest.TestCase):
    def test_pdf_multiplier_precision_and_year_selection(self):
        data=json.loads((ROOT/"data/official-snapshot.json").read_text(),parse_float=Decimal)
        self.assertEqual(len(data["plans"]),5)
        expected=[(5,308196),(7,363551),(9,420464),(11,481186)]
        timeline=list(range(1,21))+list(range(25,101,5))
        for p,(start,total) in zip(data["plans"][:4],expected):
            values=dict(p["balances"])
            self.assertEqual(list(values),timeline)
            self.assertLess(abs(values[start]*Decimal(300001)-Decimal(total)),Decimal("0.001"))
            self.assertNotIn(21,values)
            self.assertTrue(all(v>0 for v in values.values()))
        rollover=dict(data["plans"][-1]["balances"])
        self.assertEqual(Decimal(500000)*rollover[20],Decimal(1625000))
        self.assertEqual(Decimal(500000)*rollover[6],Decimal(615000))

    def test_annual_withdrawal_schedule(self):
        data=json.loads((ROOT/"data/official-snapshot.json").read_text(),parse_float=Decimal)
        for p in data["plans"][:4]:
            rate=p["rate"]
            start=p["startYear"]
            self.assertIn(start,[5,7,9,11])
            self.assertIn(rate,[Decimal("0.06"),Decimal("0.065"),Decimal("0.07"),Decimal("0.08")])
            self.assertEqual(Decimal(300000)*rate,Decimal({5:"18000",7:"19500",9:"21000",11:"24000"}[start]))
            self.assertEqual(Decimal(300000)*rate*Decimal(20-start+1),
                             Decimal({5:"18000",7:"19500",9:"21000",11:"24000"}[start])*Decimal(20-start+1))
