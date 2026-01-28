<?php
/**
 * Plugin Name:       Cherry Pick for Query Loop
 * Plugin URI:        https://wordpress.org/plugins/cherry-pick-for-query-loop/
 * Description:       Add post picking feature to Query Loop block.
 * Version:           1.0.1
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Tatsuya Saito
 * Author URI:        https://profiles.wordpress.org/saito3110/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       cherry-pick-for-query-loop
 * Domain Path:       /languages
 *
 * @package cherry-pick-for-query-loop
 */

namespace CherryPickForQueryLoop;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin version.
 */
const VERSION = '1.0.1';

/**
 * Plugin text domain.
 */
const TEXT_DOMAIN = 'cherry-pick-for-query-loop';

/**
 * Enqueue block editor assets.
 *
 * @return void
 */
function enqueue_editor_assets(): void {
	$asset_file = __DIR__ . '/build/index.asset.php';

	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = include $asset_file;

	wp_enqueue_script(
		'cherry-pick-for-query-loop',
		plugins_url( 'build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_enqueue_style(
		'cherry-pick-for-query-loop',
		plugins_url( 'build/index.css', __FILE__ ),
		array(),
		$asset['version']
	);

	wp_set_script_translations(
		'cherry-pick-for-query-loop',
		TEXT_DOMAIN,
		__DIR__ . '/languages'
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\enqueue_editor_assets' );

/**
 * Modify Query Loop block query variables to support post picking.
 *
 * @param array    $query Query variables.
 * @param \WP_Block $block Block instance.
 * @return array Modified query variables.
 */
function modify_query_loop_query( array $query, \WP_Block $block ): array {
	$include = $block->context['query']['include'] ?? array();

	if ( ! empty( $include ) && is_array( $include ) ) {
		$query['post__in'] = array_map( 'absint', $include );
		$query['orderby']  = 'post__in';
	}

	return $query;
}
add_filter( 'query_loop_block_query_vars', __NAMESPACE__ . '\modify_query_loop_query', 10, 2 );

/**
 * Modify REST API post query to support include ordering.
 *
 * @param array            $args    Query arguments.
 * @param \WP_REST_Request $request REST API request.
 * @return array Modified query arguments.
 */
function modify_rest_post_query( array $args, \WP_REST_Request $request ): array {
	$include = $request->get_param( 'include' );
	$orderby = $request->get_param( 'orderby' );

	if ( ! empty( $include ) && 'include' === $orderby && current_user_can( 'edit_posts' ) ) {
		$args['post__in']    = array_map( 'absint', (array) $include );
		$args['orderby']     = 'post__in';
		$args['post_status'] = array( 'publish', 'draft', 'pending', 'private', 'future' );
	}

	return $args;
}
add_filter( 'rest_post_query', __NAMESPACE__ . '\modify_rest_post_query', 10, 2 );
add_filter( 'rest_page_query', __NAMESPACE__ . '\modify_rest_post_query', 10, 2 );
