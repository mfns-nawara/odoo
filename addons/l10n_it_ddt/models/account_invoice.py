# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models


class AccountInvoice(models.Model):
    _inherit = 'account.move'

    def _get_ddt_values(self):
        res = {}
        line_count = 0
        invoice_line_pickings = {}
        for line in self.invoice_line_ids.filtered(lambda l: not l.display_type): #TODO: should be done?
            done_moves_related = line.sale_line_ids.mapped('move_ids').filtered(lambda m: m.state == 'done')
            invoice_line_pickings[line.id] = self.env['stock.picking']
            if len(done_moves_related) <= 1:
                if done_moves_related:
                    invoice_line_pickings[done_moves_related.picking_id] = line
            else:
                total_qty = 0
                total_invoices = done_moves_related.mapped('sale_line_ids.invoice_line_ids').sorted(lambda m: m.invoice_date)
                total_invs = [(m.product_qty, m) for m in total_invoices] #TODO: convert UoM
                inv = total_invs.pop(0)

                for move in done_moves_related.sorted(lambda m: m.date):
                    move_qty = move.product_qty
                    total_qty += move.product_qty
                    while (move_qty > 0):
                        if inv[0] > move_qty:
                            inv = (inv[0] - move_qty, inv[1])
                            invoice_line = inv[1]
                            move_qty = 0
                        if inv[0] <= move_qty:
                            move_qty -= inv[0]
                            invoice_line = inv[1]
                            if total_invs:
                                inv = total_invs.pop(0)
                            else:
                                move_qty = 0 #abort when not enough matched invoices
                        if invoice_line == line:
                            invoice_line_pickings[move.picking_id] |= line
        return invoice_line_pickings

        # 
        #
        #     line_count += 1
        #     # Now find the quantities corresponding to which move lines
        #
        #
        #
        # for line in self.invoice_line_ids.filtered(lambda l: not l.display_type):
        #     sale_order = line.sale_line_ids.mapped('order_id')
        #     invoice = sale_order.invoice_ids.filtered(lambda x: x.invoice_date)
        #     all_inv_qty = {}
        #     for invoice_line in invoice.mapped('invoice_line_ids').filtered(lambda x: x.product_id == line.product_id):
        #         all_inv_qty.setdefault(invoice_line, 0)
        #         all_inv_qty[invoice_line] += invoice_line.quantity
        #     picking_moves = sale_order.order_line.mapped('move_ids').filtered(lambda x: x.picking_id.date_done and line.product_id in x.mapped('product_id'))
        #     invoice_line_related_pickings = {}
        #     for picking_move in picking_moves.sorted(key=lambda x: x.picking_id.date_done, reverse=True):
        #         qty = picking_move.quantity_done
        #         for invoice_line, invoice_qty in all_inv_qty.items():
        #             qty -= invoice_qty
        #             if qty < 0 and not invoice_line_related_pickings:
        #                 break
        #             else:
        #                 invoice_line_related_pickings.setdefault(invoice_line, {})
        #                 invoice_line_related_pickings[invoice_line].update({picking_move.picking_id: []})
        #                 picking_move.picking_id.invoice_ids += line.move_id
        #         if qty <= 0:
        #             break
        #     res.update(invoice_line_related_pickings.get(line, {}))
        # return res

    def _export_as_xml(self, template_values):
        template_values['ddt_dict'] = self._get_ddt_values()
        content = self.env.ref('l10n_it_edi.account_invoice_it_FatturaPA_export').render(template_values)
        return content
