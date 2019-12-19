# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.sale_timesheet.tests.common import TestCommonSaleTimesheetNoChart

class TestProjectBillingMulticompany(TestCommonSaleTimesheetNoChart):

    @classmethod
    def setUpClass(cls):
        super(TestProjectBillingMulticompany, cls).setUpClass()

        cls.company_a = cls.env['res.company'].create({
            'name': 'Company A'
        })

        cls.company_b = cls.env['res.company'].create({
            'name': 'Company B'
        })

        cls.setUpServiceProducts()

        Project = cls.env['project.project'].with_context(tracking_disable=True)
        cls.project_non_billable_a = Project.create({
            'name': "Non Billable Project A",
            'allow_timesheets': True,
            'billable_type': 'no',
            'company_id': cls.company_a.id,
        })

    def test_makeBillable_multiCompany(self):
        wizard = self.env['project.create.sale.order'].with_context(allowed_company_ids=[self.company_a.id, self.company_b.id], company_id=self.company_b.id, active_id=self.project_non_billable_a.id, active_model='project.project').create({
            'product_id': self.product_delivery_timesheet3.id,  # product creates new T in new P
            'price_unit': self.product_delivery_timesheet3.list_price,
            'billable_type': 'project_rate',
            'partner_id': self.partner_customer_usd.id,
        })

        action = wizard.action_create_sale_order()
        sale_order = self.env['sale.order'].browse(action['res_id'])

        self.assertEqual(sale_order.company_id.id, self.project_non_billable_a.company_id.id, "The company on the sale order should be the same as the one on the project")
