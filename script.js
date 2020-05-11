jQuery(function () {
    jQuery('#wiki__text').on('paste', function (event) {
        /**
         * Decodes HTML entities
         *
         * @param input
         * @returns {string}
         */
        function htmlDecode(input) {
            const doc = new DOMParser().parseFromString(input, "text/html");
            return doc.documentElement.textContent;
        }

        /**
         * Checks all interwiki patterns to reverse engineer
         * an interwiki link from pasted and selected text.
         * Returns false if nothing matches.
         *
         * @param url
         * @param title
         * @returns {string|boolean}
         */
        function getIwl(url, title) {
            const patterns = JSON.parse(JSINFO.plugins.interwikipaste.patterns);
            if (title) {
                title = '|' + title;
            }
            for (let i = 0; i < patterns.length; i++) {
                let patternConf = patterns[i];
                let regex = new RegExp(patternConf.pattern, 'g');
                let matched = regex.exec(url);
                if (matched !== null) {
                    let captured = matched[1] ? matched[1] : '';
                    if (patternConf.encode) {
                        captured = htmlDecode(captured);
                    }
                    return `[[${patternConf.shortcut}>${captured}${title}]]`;
                }
            }
            return false;
        }

        const $editor = jQuery(this);
        const currentSelection = DWgetSelection($editor[0]);
        const selected = currentSelection.getText();
        const pasted = event.originalEvent.clipboardData.getData('text');
        let result;

        // if not a URL, let the browser handle it
        if (pasted.search(/^http[^ ]+$/) === -1) {
            return;
        }
        result = getIwl(pasted, selected);
        if (result) {
            event.preventDefault();
            pasteText(currentSelection, result, {});
        }
    });
});
