jQuery(function () {
    jQuery('#wiki__text').on('paste', function (event) {
        const url = DOKU_BASE + 'lib/exe/ajax.php';
        const $editor = jQuery(this);
        const currentSelection = DWgetSelection($editor[0]);
        const selected = currentSelection.getText();
        const pasted = event.originalEvent.clipboardData.getData('text');

        event.preventDefault();

        jQuery.ajax({
            url: url,
            data: {
                call: 'plugin_interwikipaste',
                selected: selected,
                pasted: pasted,
            }
        })
        .done(jQuery.proxy(function(response) {
            pasteText(currentSelection, response, {});
        }, this))
        .fail(jQuery.proxy(function(xhr) {
            const msg = typeof xhr === 'string' ? xhr : xhr.responseText || xhr.statusText || 'Unknown error';
            alert(msg);
        }, this));
    });
});
