<?php
/**
 * Plugin Name:       First in Queue Chat
 * Plugin URI:        https://firstinqueue.com
 * Description:        Add your First in Queue AI chat widget to your WordPress site. Paste your property key and the chat bubble appears automatically.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.2
 * Author:            First in Queue
 * Author URI:        https://firstinqueue.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       first-in-queue
 *
 * Scope (spec §8): read the property key from a settings field and inject the
 * one-line loader snippet in wp_footer. Nothing more — the widget itself is
 * served and secured by First in Queue.
 */

// No direct access.
defined( 'ABSPATH' ) || exit;

define( 'FIQ_OPTION', 'fiq_options' );
define( 'FIQ_DEFAULT_HOST', 'https://app.firstinqueue.com' );

/**
 * Default option values.
 *
 * @return array{widget_key:string,widget_host:string}
 */
function fiq_defaults() {
	return array(
		'widget_key'  => '',
		'widget_host' => FIQ_DEFAULT_HOST,
	);
}

/**
 * Current options merged over defaults.
 *
 * @return array{widget_key:string,widget_host:string}
 */
function fiq_get_options() {
	$saved = get_option( FIQ_OPTION, array() );
	if ( ! is_array( $saved ) ) {
		$saved = array();
	}
	return wp_parse_args( $saved, fiq_defaults() );
}

/**
 * A widget key is `fiq_live_` followed by exactly 32 base62 characters.
 *
 * @param string $key Candidate key.
 * @return bool
 */
function fiq_is_key_shaped( $key ) {
	return (bool) preg_match( '/^fiq_live_[0-9A-Za-z]{32}$/', (string) $key );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

add_action( 'admin_menu', 'fiq_add_settings_page' );
add_action( 'admin_init', 'fiq_register_settings' );

function fiq_add_settings_page() {
	add_options_page(
		__( 'First in Queue Chat', 'first-in-queue' ),
		__( 'First in Queue Chat', 'first-in-queue' ),
		'manage_options',
		'first-in-queue',
		'fiq_render_settings_page'
	);
}

function fiq_register_settings() {
	register_setting(
		'fiq_settings_group',
		FIQ_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'fiq_sanitize_options',
			'default'           => fiq_defaults(),
		)
	);
}

/**
 * Validate + normalize submitted settings.
 *
 * A malformed key is rejected rather than stored, so the site never ships a
 * snippet that can't load. Rejecting means keeping whatever was already saved:
 * a typo on a live site must not silently take the widget offline. Clearing the
 * field (submitting it empty) is the explicit way to switch the widget off.
 *
 * @param mixed $input Raw submitted value.
 * @return array{widget_key:string,widget_host:string}
 */
function fiq_sanitize_options( $input ) {
	$current = fiq_get_options();
	$out     = $current;

	if ( ! is_array( $input ) ) {
		return $out;
	}

	$key = isset( $input['widget_key'] ) ? trim( (string) $input['widget_key'] ) : '';
	if ( '' === $key ) {
		$out['widget_key'] = '';
	} elseif ( fiq_is_key_shaped( $key ) ) {
		$out['widget_key'] = $key;
	} else {
		// Keep the stored key untouched and tell them why nothing changed.
		add_settings_error(
			FIQ_OPTION,
			'fiq_bad_key',
			__( 'That doesn\'t look like a First in Queue property key. It should start with "fiq_live_" followed by 32 letters and numbers. Copy it from your dashboard. Your previous setting was kept.', 'first-in-queue' ),
			'error'
		);
	}

	$host = isset( $input['widget_host'] ) ? trim( (string) $input['widget_host'] ) : '';
	if ( '' === $host ) {
		$out['widget_host'] = FIQ_DEFAULT_HOST;
	} else {
		$host = esc_url_raw( $host, array( 'https' ) );
		if ( $host ) {
			$out['widget_host'] = untrailingslashit( $host );
		} else {
			add_settings_error(
				FIQ_OPTION,
				'fiq_bad_host',
				__( 'The widget host must be a full https:// address. Your previous setting was kept.', 'first-in-queue' ),
				'error'
			);
		}
	}

	return $out;
}

function fiq_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$opts = fiq_get_options();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'First in Queue Chat', 'first-in-queue' ); ?></h1>
		<p><?php esc_html_e( 'Paste your property key from your First in Queue dashboard. The chat widget then appears on every page of your site.', 'first-in-queue' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'fiq_settings_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">
						<label for="fiq_widget_key"><?php esc_html_e( 'Property key', 'first-in-queue' ); ?></label>
					</th>
					<td>
						<input
							name="<?php echo esc_attr( FIQ_OPTION ); ?>[widget_key]"
							id="fiq_widget_key"
							type="text"
							class="regular-text code"
							value="<?php echo esc_attr( $opts['widget_key'] ); ?>"
							placeholder="fiq_live_..."
							autocomplete="off"
						/>
						<p class="description"><?php esc_html_e( 'Dashboard → Websites → copy the key (starts with fiq_live_).', 'first-in-queue' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row">
						<label for="fiq_widget_host"><?php esc_html_e( 'Widget host', 'first-in-queue' ); ?></label>
					</th>
					<td>
						<input
							name="<?php echo esc_attr( FIQ_OPTION ); ?>[widget_host]"
							id="fiq_widget_host"
							type="url"
							class="regular-text code"
							value="<?php echo esc_attr( $opts['widget_host'] ); ?>"
							placeholder="<?php echo esc_attr( FIQ_DEFAULT_HOST ); ?>"
						/>
						<p class="description"><?php esc_html_e( 'Leave as the default unless First in Queue support tells you otherwise.', 'first-in-queue' ); ?></p>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<?php if ( fiq_is_key_shaped( $opts['widget_key'] ) ) : ?>
			<p style="color:#059669;font-weight:600">
				<?php esc_html_e( 'Your widget is active on this site.', 'first-in-queue' ); ?>
			</p>
		<?php endif; ?>
	</div>
	<?php
}

// Settings link on the Plugins list row.
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'fiq_action_links' );

function fiq_action_links( $links ) {
	$url      = admin_url( 'options-general.php?page=first-in-queue' );
	$settings = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'first-in-queue' ) . '</a>';
	array_unshift( $links, $settings );
	return $links;
}

// ---------------------------------------------------------------------------
// Front-end injection
// ---------------------------------------------------------------------------

add_action( 'wp_footer', 'fiq_render_widget_snippet' );

/**
 * Emit the one-line loader just before </body>. Only runs when a well-formed
 * key is configured; output is fully escaped.
 */
function fiq_render_widget_snippet() {
	$opts = fiq_get_options();
	if ( ! fiq_is_key_shaped( $opts['widget_key'] ) ) {
		return;
	}
	printf(
		'<script src="%s" data-key="%s" async></script>' . "\n",
		esc_url( $opts['widget_host'] . '/widget.js' ),
		esc_attr( $opts['widget_key'] )
	);
}
