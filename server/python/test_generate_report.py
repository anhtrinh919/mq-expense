"""Run: python3 -m unittest server/python/test_generate_report.py (from the repo root)."""
import os
import sys
import tempfile
import unittest

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_report  # noqa: E402

TEMPLATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "expense_invoice_template.xlsx")
HANH = ["Bui Hong Hanh", "Hanh Bui", "Ecopark", "Solforest", "160000", "139927", "h.bui@", "BUI HONG HANH",
        "10844397", "ASCBVNVX", "ACB", "HBEXPENSE25", "Dec 2025", "39094540"]


def peer_job(**submitter):
    sub = {"name": "Rizky Pratama", "addressLine1": "Jl. Sudirman 1", "addressLine2": "", "country": "Indonesia", "phone": ""}
    sub.update(submitter)
    return {
        "invoiceTemplate": TEMPLATE,
        "invoiceNumber": "RPEXP26-1",
        "generatedDate": "2026-10-17",
        "periodLabel": "Oct 2026",
        "baseCurrency": "IDR",
        "profile": {
            "vendorId": "",
            "submitter": sub,
            "invoiceTo": {"name": "Macquarie University", "address": "Sydney NSW", "email": ""},
            "bank": {"accountName": "RIZKY PRATAMA", "accountNumber": "123", "swift": "", "bankName": "BCA"},
        },
    }


def cells(path):
    ws = openpyxl.load_workbook(path).worksheets[0]
    return {c.coordinate: c.value for row in ws.iter_rows() for c in row if c.value not in (None, "")}


class InvoiceTest(unittest.TestCase):
    def fill(self, job):
        out = os.path.join(tempfile.mkdtemp(), "inv.xlsx")
        generate_report.generate_invoice(job, 1500000, out)
        return cells(out)

    def test_peer_invoice_has_no_template_person_data(self):
        text = " ".join(str(v) for v in self.fill(peer_job()).values())
        for s in HANH:
            self.assertNotIn(s, text)

    def test_header_uses_business_name_else_full_name(self):
        self.assertTrue(self.fill(peer_job(businessName="Pratama Trading"))["A1"].startswith("Pratama Trading"))
        a1 = self.fill(peer_job())["A1"]
        self.assertTrue(a1.startswith("Rizky Pratama"))
        self.assertTrue(a1.rstrip().endswith("Invoice"))

    def test_empty_recipient_address_falls_back_to_macquarie(self):
        job = peer_job()
        job["profile"]["invoiceTo"]["address"] = ""
        c = self.fill(job)
        self.assertEqual([c.get("A12"), c.get("A13"), c.get("A14")],
                         ["Ground Floor,", "8 Sir Christopher Ondaatje Ave", "NSW 2109 AUSTRALIA"])

    def test_total_labels_use_profile_currency(self):
        c = self.fill(peer_job())
        self.assertEqual(c["D17"], "TOTAL (IDR)")
        self.assertEqual(c["B30"], "Total (IDR)")

    def test_filled_fields_still_land(self):
        c = self.fill(peer_job(phone="0812"))
        self.assertEqual(c["A4"], "Rizky Pratama")
        self.assertEqual(c["A8"], "0812")
        self.assertEqual(c["D6"], "RPEXP26-1")
        self.assertEqual(c["B33"], "RIZKY PRATAMA")


if __name__ == "__main__":
    unittest.main()
