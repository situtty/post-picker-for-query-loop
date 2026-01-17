=== Post Picker for Query Loop ===
Contributors: saito3110
Tags: query loop, post picker, block editor, gutenberg, posts
Requires at least: 6.4
Tested up to: 6.9
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Pick specific posts for Query Loop block and display them in your preferred order.

== Description ==

Post Picker for Query Loop extends the core Query Loop block with a post picking feature. Select specific posts and display them in any order you choose.

= Features =

* Pick specific posts to display in Query Loop block
* Search and select posts by title
* Display posts in your selected order
* Respects Query Loop filters (parent, category, keyword, etc.)
* Works with any post type
* Fully compatible with block themes

= How it works =

1. Add a Query Loop block to your page
2. In the block settings sidebar, find the "Pick Posts" panel
3. Search and select posts from the dropdown
4. Posts will be displayed in the order you selected
5. To return to default behavior, simply remove all selected posts

Note: When posts are selected, sorting and sticky post settings are ignored.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/post-picker-for-query-loop` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Edit any page or post, add a Query Loop block, and find the "Pick Posts" panel in the block settings.

== Frequently Asked Questions ==

= Does this work with custom post types? =

Yes, it works with any post type that Query Loop block supports.

= Will pagination still work? =

Yes, pagination works normally. If you select 10 posts and set 3 posts per page, you'll get 4 pages.

= Can I use filters with post picking? =

Yes, the post picker respects Query Loop filter settings (parent page, category, keyword, etc.). Only posts matching the filters will appear in the search dropdown.

= What happens to sticky posts? =

Sticky post settings are ignored when posts are selected. Posts are displayed in your selected order only.

== Screenshots ==

1. Post picker panel in block settings
2. Search and select posts from dropdown

== Changelog ==

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.0.0 =
Initial release.
