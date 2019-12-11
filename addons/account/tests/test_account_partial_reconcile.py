# -*- coding: utf-8 -*-
from odoo.addons.account.tests.common import AccountTestInvoicingCommon
from odoo.tests import tagged, new_test_user
from odoo.tests.common import Form
from odoo import fields


@tagged('post_install', '-at_install')
class TestAccountPartialReconcile(AccountTestInvoicingCommon):
    ''' Tests about the account.partial.reconcile model, not the reconciliation itself but mainly the computation of
    the residual amounts on account.move.line.
    '''

    @classmethod
    def setUpClass(cls):
        super(TestAccountPartialReconcile, cls).setUpClass()

        cls.move_single_currency_1 = cls.env['account.move'].create({
            'type': 'entry',
            'date': fields.Date.from_string('2016-01-01'),
            'line_ids': [(0, None, {
                'name': 'line_%s' % i,
                'account_id': cls.company_data['default_account_receivable'].id,
                'debit': balance if balance > 0.0 else 0.0,
                'credit': -balance if balance < 0.0 else 0.0,
            }) for i, balance in (
                (0, 100.0),
                (1, 300.0),
                (2, 600.0),
                (3, 1000.0),
                (4, -100.0),
                (5, -300.0),
                (6, -600.0),
                (7, -1000.0),
            )],
        })

        cls.move_foreign_currency_1 = cls.env['account.move'].create({
            'type': 'entry',
            'date': fields.Date.from_string('2016-01-01'),
            'line_ids': [(0, None, {
                'name': 'line_%s' % i,
                'account_id': cls.company_data['default_account_receivable'].id,
                'currency_id': cls.currency_data['currency'].id,
                'amount_currency': balance * rate,
                'debit': balance if balance > 0.0 else 0.0,
                'credit': -balance if balance < 0.0 else 0.0,
            }) for i, rate, balance in (
                (0, 9, 100.0),
                (1, 3, 300.0),
                (2, 2, 600.0),
                (3, 3, 1000.0),
                (4, 9, -100.0),
                (5, 3, -300.0),
                (6, 2, -600.0),
                (7, 3, -1000.0),
            )],
        })

    def _get_line(self, move, index):
        return move.line_ids.filtered(lambda line: line.name == 'line_%s' % index)

    def test_residual_amount_no_reconciliation(self):
        self.assertRecordValues(
            self.move_single_currency_1.line_ids.sorted('name'),
            [
                {'amount_residual': 100.0,      'amount_residual_currency': 100.0,      'reconciled': False},
                {'amount_residual': 300.0,      'amount_residual_currency': 300.0,      'reconciled': False},
                {'amount_residual': 600.0,      'amount_residual_currency': 600.0,      'reconciled': False},
                {'amount_residual': 1000.0,     'amount_residual_currency': 1000.0,     'reconciled': False},
                {'amount_residual': -100.0,     'amount_residual_currency': -100.0,     'reconciled': False},
                {'amount_residual': -300.0,     'amount_residual_currency': -300.0,     'reconciled': False},
                {'amount_residual': -600.0,     'amount_residual_currency': -600.0,     'reconciled': False},
                {'amount_residual': -1000.0,    'amount_residual_currency': -1000.0,    'reconciled': False},
            ]
        )

        self.assertRecordValues(
            self.move_foreign_currency_1.line_ids.sorted('name'),
            [
                {'amount_residual': 100.0,      'amount_residual_currency': 900.0,      'reconciled': False},
                {'amount_residual': 300.0,      'amount_residual_currency': 900.0,      'reconciled': False},
                {'amount_residual': 600.0,      'amount_residual_currency': 1200.0,     'reconciled': False},
                {'amount_residual': 1000.0,     'amount_residual_currency': 3000.0,     'reconciled': False},
                {'amount_residual': -100.0,     'amount_residual_currency': -900.0,     'reconciled': False},
                {'amount_residual': -300.0,     'amount_residual_currency': -900.0,     'reconciled': False},
                {'amount_residual': -600.0,     'amount_residual_currency': -1200.0,    'reconciled': False},
                {'amount_residual': -1000.0,    'amount_residual_currency': -3000.0,    'reconciled': False},
            ]
        )

    def test_residual_no_foreign_currency_debit(self):
        ''' Test a simple flow reconciling multiple times a line having a debit amount.
        The reconciliations are all done in single-currency.
        '''

        debit_line = self._get_line(self.move_single_currency_1, 3)
        credit_line_1 = self._get_line(self.move_single_currency_1, 4)
        credit_line_2 = self._get_line(self.move_single_currency_1, 5)
        credit_line_3 = self._get_line(self.move_single_currency_1, 6)

        self.env['account.partial.reconcile'].create([
            {
                'amount': 100.0,
                'amount_currency': 100.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_1.id,
                'currency_id': self.company_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_1,
            [
                {'amount_residual': 900.0,      'amount_residual_currency': 900.0,      'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 300.0,
                'amount_currency': 300.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_2.id,
                'currency_id': self.company_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_2,
            [
                {'amount_residual': 600.0,      'amount_residual_currency': 600.0,      'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 600.0,
                'amount_currency': 600.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_3.id,
                'currency_id': self.company_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_3,
            [
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

    def test_residual_no_foreign_currency_credit(self):
        ''' Test a simple flow reconciling multiple times a line having a credit amount.
        The reconciliations are all done in single-currency.
        '''

        credit_line = self._get_line(self.move_single_currency_1, 7)
        debit_line_1 = self._get_line(self.move_single_currency_1, 0)
        debit_line_2 = self._get_line(self.move_single_currency_1, 1)
        debit_line_3 = self._get_line(self.move_single_currency_1, 2)

        self.env['account.partial.reconcile'].create([
            {
                'amount': 100.0,
                'amount_currency': 100.0,
                'debit_move_id': debit_line_1.id,
                'credit_move_id': credit_line.id,
                'currency_id': self.company_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_1,
            [
                {'amount_residual': -900.0,     'amount_residual_currency': -900.0,     'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 300.0,
                'amount_currency': 300.0,
                'debit_move_id': debit_line_2.id,
                'credit_move_id': credit_line.id,
                'currency_id': self.company_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_2,
            [
                {'amount_residual': -600.0,     'amount_residual_currency': -600.0,     'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 600.0,
                'amount_currency': 600.0,
                'debit_move_id': debit_line_3.id,
                'credit_move_id': credit_line.id,
                'currency_id': self.company_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_3,
            [
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

    def test_residual_same_foreign_currency_debit(self):
        ''' Test a simple flow reconciling multiple times a line having a debit amount.
        The reconciliations are all done in multi-currency.
        '''

        debit_line = self._get_line(self.move_foreign_currency_1, 3)
        credit_line_1 = self._get_line(self.move_foreign_currency_1, 4)
        credit_line_2 = self._get_line(self.move_foreign_currency_1, 5)
        credit_line_3 = self._get_line(self.move_foreign_currency_1, 6)

        self.env['account.partial.reconcile'].create([
            {
                'amount': 100.0,
                'amount_currency': 900.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_1.id,
                'currency_id': self.currency_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_1,
            [
                {'amount_residual': 900.0,      'amount_residual_currency': 2100.0,     'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 300.0,
                'amount_currency': 900.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_2.id,
                'currency_id': self.currency_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_2,
            [
                {'amount_residual': 600.0,      'amount_residual_currency': 1200.0,     'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 600.0,
                'amount_currency': 1200.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_3.id,
                'currency_id': self.currency_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_3,
            [
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

    def test_residual_same_foreign_currency_credit(self):
        ''' Test a simple flow reconciling multiple times a line having a credit amount.
        The reconciliations are all done in multi-currency.
        '''

        credit_line = self._get_line(self.move_foreign_currency_1, 7)
        debit_line_1 = self._get_line(self.move_foreign_currency_1, 0)
        debit_line_2 = self._get_line(self.move_foreign_currency_1, 1)
        debit_line_3 = self._get_line(self.move_foreign_currency_1, 2)

        self.env['account.partial.reconcile'].create([
            {
                'amount': 100.0,
                'amount_currency': 900.0,
                'debit_move_id': debit_line_1.id,
                'credit_move_id': credit_line.id,
                'currency_id': self.currency_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_1,
            [
                {'amount_residual': -900.0,     'amount_residual_currency': -2100.0,    'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 300.0,
                'amount_currency': 900.0,
                'debit_move_id': debit_line_2.id,
                'credit_move_id': credit_line.id,
                'currency_id': self.currency_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_2,
            [
                {'amount_residual': -600.0,     'amount_residual_currency': -1200.0,    'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 600.0,
                'amount_currency': 1200.0,
                'debit_move_id': debit_line_3.id,
                'credit_move_id': credit_line.id,
                'currency_id': self.currency_data['currency'].id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_3,
            [
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

    def test_residual_multiple_foreign_currency_debit(self):
        ''' Test a flow reconciling multiple times a line having a debit amount.
        The reconciliations are done using multiple foreign currencies.
        Then, this test is there to ensure the right conversion rate is used.
        '''

        debit_line = self._get_line(self.move_foreign_currency_1, 3)
        credit_line_1 = self._get_line(self.move_single_currency_1, 4)
        credit_line_2 = self._get_line(self.move_single_currency_1, 5)
        credit_line_3 = self._get_line(self.move_single_currency_1, 6)

        self.env['account.partial.reconcile'].create([
            {
                'amount': 100.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_1.id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_1,
            [
                {'amount_residual': 900.0,      'amount_residual_currency': 2700.0,     'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 300.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_2.id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_2,
            [
                {'amount_residual': 600.0,      'amount_residual_currency': 1800.0,     'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 600.0,
                'debit_move_id': debit_line.id,
                'credit_move_id': credit_line_3.id,
            },
        ])

        self.assertRecordValues(
            debit_line + credit_line_3,
            [
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

    def test_residual_multiple_foreign_currency_credit(self):
        ''' Test a flow reconciling multiple times a line having a credit amount.
        The reconciliations are done using multiple foreign currencies.
        Then, this test is there to ensure the right conversion rate is used.
        '''

        credit_line = self._get_line(self.move_foreign_currency_1, 7)
        debit_line_1 = self._get_line(self.move_single_currency_1, 0)
        debit_line_2 = self._get_line(self.move_single_currency_1, 1)
        debit_line_3 = self._get_line(self.move_single_currency_1, 2)

        self.env['account.partial.reconcile'].create([
            {
                'amount': 100.0,
                'debit_move_id': debit_line_1.id,
                'credit_move_id': credit_line.id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_1,
            [
                {'amount_residual': -900.0,     'amount_residual_currency': -2700.0,    'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 300.0,
                'debit_move_id': debit_line_2.id,
                'credit_move_id': credit_line.id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_2,
            [
                {'amount_residual': -600.0,     'amount_residual_currency': -1800.0,    'reconciled': False},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )

        self.env['account.partial.reconcile'].create([
            {
                'amount': 600.0,
                'debit_move_id': debit_line_3.id,
                'credit_move_id': credit_line.id,
            },
        ])

        self.assertRecordValues(
            credit_line + debit_line_3,
            [
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
                {'amount_residual': 0.0,        'amount_residual_currency': 0.0,        'reconciled': True},
            ]
        )
