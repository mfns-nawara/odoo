# -*- encoding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from . import efaktur
from . import account_move
from . import res_partner


# Do we need numbers for refunds?
# What about JUMLAH_PPNBM UANG_MUKA_PPNBM JALAN BLOK NOMOR RT RW KECAMATAN KELURAHAN KABUPATEN PROPINSI KODE_POS NOMOR_TELEPON KODE_OBJEK JUMLAH_BARANG TARIF_PPNBM PPNBM
# Difference between npwp_o on number and invoice? Same with partner? Can it change? Is it required? Some link with replaced invoice?
# Tax address and tax name on partner?
# can you consume a number for a partner without L10N Id Pkp?
# l10n_id_tax_number always equal to the number?
# need to have a view with all the numbers and validated/uploaded/... even the non used ones?
# have to configure both customers and suppliers for pkp?
# company_id?
# when changing number should the old number still be in the list view? In the csv?
# dependence on sales and account_reports?
# config on partner ror company?
