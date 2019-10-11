# coding: utf-8
import odoo

from datetime import timedelta

from odoo.tests import HttpCase
from odoo.addons.website.tools import MockRequest


class WebsiteVisitorTests(HttpCase):
    def setUp(self):
        super().setUp()
        self.website = self.env['website'].browse(1)
        self.cookies = {}

    def test_create_visitor_on_tracked_page(self):
        Page = self.env['website.page']
        View = self.env['ir.ui.view']
        Visitor = self.env['website.visitor']
        Track = self.env['website.track']
        untracked_view = View.create({
            'name': 'Base',
            'type': 'qweb',
            'arch': '''<t name="Homepage" t-name="website.base_view">
                        <t t-call="website.layout">
                            I am a generic page
                        </t>
                    </t>''',
            'key': 'test.base_view',
            'track': False,
        })
        tracked_view = View.create({
            'name': 'Base',
            'type': 'qweb',
            'arch': '''<t name="Homepage" t-name="website.base_view">
                        <t t-call="website.layout">
                            I am a generic page
                        </t>
                    </t>''',
            'key': 'test.base_view',
            'track': True,
        })
        tracked_view_2 = View.create({
            'name': 'Base',
            'type': 'qweb',
            'arch': '''<t name="OtherPage" t-name="website.base_view">
                        <t t-call="website.layout">
                            I am a generic second page
                        </t>
                    </t>''',
            'key': 'test.base_view',
            'track': True,
        })
        [untracked_view, tracked_view, tracked_view_2] = Page.create([
            {
                'view_id': untracked_view.id,
                'url': '/untracked_view',
                'website_published': True,
            },
            {
                'view_id': tracked_view.id,
                'url': '/tracked_view',
                'website_published': True,
            },
            {
                'view_id': tracked_view_2.id,
                'url': '/tracked_view_2',
                'website_published': True,
            },
        ])

        self.assertEqual(len(Visitor.search([])), 0, "No visitor at the moment")
        self.assertEqual(len(Track.search([])), 0, "No track at the moment")
        self.url_open(untracked_view.url)
        self.url_open(tracked_view.url)
        self.url_open(tracked_view.url)
        self.assertEqual(len(Visitor.search([])), 1, "1 visitor should be created")
        self.assertEqual(len(Track.search([])), 1, "There should be 1 tracked page")

        # admin connects
        visitor_admin = Visitor.search([])
        self.cookies = {'visitor_uuid': visitor_admin.access_token}
        with MockRequest(self.env, website=self.website, cookies=self.cookies):
            self.authenticate('admin', 'admin')
        # visit a page
        self.url_open(tracked_view_2.url)

        visitor_admin.refresh()
        # page is tracked
        self.assertEqual(len(visitor_admin.website_track_ids), 2, "There should be 2 tracked pages for the admin")
        # visitor is linked
        self.assertEqual(visitor_admin.partner_id, self.env['res.users'].browse(self.session.uid).partner_id, "Visitor should be linked with connected partner")

        # portal user connects
        with MockRequest(self.env, website=self.website, cookies=self.cookies):
            self.authenticate('portal', 'portal')
            self.assertEqual(len(Visitor.search([])), 1, "No extra visitor should be created")
        # visit a page
        self.url_open(tracked_view.url)
        self.url_open(untracked_view.url)
        self.url_open(tracked_view_2.url)
        self.url_open(tracked_view_2.url)  # 2 time to be sure it does not record twice

        # new visitor is created
        self.assertEqual(len(Visitor.search([])), 2, "One extra visitor should be created")
        visitor_portal = Visitor.search([])[0]
        self.cookies['visitor_uuid'] = visitor_portal.access_token
        # visitor is linked
        self.assertEqual(visitor_portal.partner_id, self.env['res.users'].browse(self.session.uid).partner_id, "Visitor should be linked with connected partner")
        # tracks are created
        self.assertEqual(len(visitor_portal.website_track_ids), 2, "There should be 2 tracked pages for the portal user")

        # portal user disconnects
        self.logout()

        # visit some pages
        self.url_open(tracked_view.url)
        self.url_open(untracked_view.url)
        self.url_open(tracked_view_2.url)
        self.url_open(tracked_view_2.url)  # 2 time to be sure it does not record twice

        # new visitor is created
        self.assertEqual(len(Visitor.search([])), 3, "One extra visitor should be created")
        visitor = Visitor.search([])[0]
        self.cookies['visitor_uuid'] = visitor.access_token
        # tracks are created
        self.assertEqual(len(visitor.website_track_ids), 2, "There should be 2 tracked page for the visitor")
        # visitor is not linked
        self.assertFalse(visitor.partner_id, "Visitor should not be linked to any partner")

        # admin connects
        with MockRequest(self.env, website=self.website, cookies=self.cookies):
            self.authenticate('admin', 'admin')

        # one visitor is deleted
        self.assertEqual(len(Visitor.search([])), 2, "One visitor should be deleted")
        admin_partner_id = self.env['res.users'].browse(self.session.uid).partner_id
        visitor_admin = Visitor.search([('partner_id', '=', admin_partner_id.id)])
        # tracks are linked
        self.assertEqual(len(visitor_admin.website_track_ids), 4, "There should be 4 tracked page for the admin")

        # admin user disconnects
        self.logout()

        # visit some pages
        self.url_open(tracked_view.url)
        self.url_open(untracked_view.url)
        self.url_open(tracked_view_2.url)
        self.url_open(tracked_view_2.url)  # 2 time to be sure it does not record twice

        # new visitor created
        self.assertEqual(len(Visitor.search([])), 3, "One extra visitor should be created")
        visitor = Visitor.search([])[0]
        self.cookies['visitor_uuid'] = visitor.access_token
        # tracks are created
        self.assertEqual(len(visitor.website_track_ids), 2, "There should be 2 tracked page for the visitor")
        # visitor is not linked
        self.assertFalse(visitor.partner_id, "Visitor should not be linked to any partner")

        # portal user connects
        with MockRequest(self.env, website=self.website, cookies=self.cookies):
            self.authenticate('portal', 'portal')

        # one visitor is deleted
        self.assertEqual(len(Visitor.search([])), 2, "One visitor should be deleted")
        portal_partner_id = self.env['res.users'].browse(self.session.uid).partner_id
        visitor_portal = Visitor.search([('partner_id', '=', portal_partner_id.id)])
        # tracks are linked
        self.assertEqual(len(visitor_portal.website_track_ids), 4, "There should be 4 tracked page for the portal user")

        # simulate the portal user comes back 30min later
        for track in visitor_portal.website_track_ids:
            track.write({'visit_datetime': track.visit_datetime - timedelta(minutes=30)})

        # visit a page
        self.url_open(tracked_view.url)
        visitor_portal.refresh()
        # tracks are created
        self.assertEqual(len(visitor_portal.website_track_ids), 5, "There should be 5 tracked page for the portal user")

        # simulate the portal user comes back 8hours later
        visitor_portal.write({'last_connection_datetime': visitor_portal.last_connection_datetime - timedelta(hours=8)})
        self.url_open(tracked_view.url)
        visitor_portal.refresh()
        # check number of visits
        self.assertEqual(visitor_portal.visit_count, 2, "There should be 2 visits for the portal user")
