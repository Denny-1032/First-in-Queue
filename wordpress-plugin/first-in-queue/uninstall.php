<?php
/**
 * Fired when the plugin is deleted from the WordPress admin. Removes the stored
 * option so no First in Queue data lingers after uninstall.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'fiq_options' );
