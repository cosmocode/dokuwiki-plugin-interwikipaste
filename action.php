<?php

/**
 * Class action_plugin_interwikipaste
 */
class action_plugin_interwikipaste extends DokuWiki_Action_Plugin
{
    /**
     * Register handlers for event hooks
     *
     * @param Doku_Event_Handler $controller
     */
    public function register(Doku_Event_Handler $controller)
    {
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handleAjaxCall');
    }

    /**
     * Analyzes the pasted text and inserts an interwiki link instead,
     * if one can be constructed. The selected text is used as link title in that case.
     * Otherwise the clipboard content is simply pasted into the editor and replaces
     * the selected text.
     *
     * @param Doku_Event $event
     */
    public function handleAjaxCall(Doku_Event $event)
    {
        if($event->data !== 'plugin_interwikipaste') return;

        $event->preventDefault();
        $event->stopPropagation();

        global $INPUT;
        $pasted = trim($INPUT->str('pasted'));
        $title = $INPUT->str('selected');

        // FIXME better check if $pasted is a URL
        $matches = [];
        if ($pasted && preg_match('/^http[^ ]+$/', $pasted, $matches)) {
            // try to build the interwiki link
            echo $this->getIwl($pasted, $title);
        } else {
            echo $pasted;
        }
    }

    /**
     * Loads interwiki configuration and transforms it into regular expressions
     *
     * @return array
     */
    protected function getInterwikiPatterns()
    {
        $patterns = [];
        $wikis = getInterwiki();

        // sort urls by longer first (probably more specific matches)
        uasort($wikis, function ($a, $b) {
            if (strlen($a) === strlen($b)) {
                return 0;
            }
            return (strlen($a) > strlen($b)) ? -1 : 1;
        });

        foreach ($wikis as $shortcut => $url) {
            // escaping now makes it easier to manipulate regex patterns later
            $pattern = preg_quote_cb($url);

            // replace already escaped placeholders with named groups
            $pattern = preg_replace(
                '/\\\{(URL|NAME|SCHEME|HOST|PORT|PATH|QUERY)\\\}/',
                '(?<$1>[^ ]+)',
                $pattern,
                -1,
                $cnt
            );

            // prepare to capture remainder if no placeholder is used
            if (!$cnt) {
                $pattern .= '(?<REMAINDER>[^ ]*)';
            }

            $patterns[$shortcut] = '/' . $pattern . '/';
        }

        return $patterns;
    }

    /**
     * Returns the interwiki link if applicable, otherwise simply the pasted text
     *
     * @param string $url Pasted url
     * @param string $title Current text selection to be used as link title
     * @return string
     */
    protected function getIwl($url, $title)
    {
        if (!empty($title)) {
            $title = '|' . $title;
        }
        $iwlTemplate = "[[%s>%s$title]]";
        $patterns = $this->getInterwikiPatterns();

        foreach ($patterns as $shortcut => $pattern) {
            $matches = [];
            if (preg_match($pattern, $url, $matches)) {
                if (!empty($matches['NAME'])) {
                    return sprintf($iwlTemplate, $shortcut, $matches['NAME']);
                }
                if (!empty($matches['PATH'])) {
                    return sprintf($iwlTemplate, $shortcut, $matches['PATH']);
                }
                if (!empty($matches['REMAINDER'])) {
                    return sprintf($iwlTemplate, $shortcut, $matches['REMAINDER']);
                }
                if (!empty($matches['URL'])) {
                    return sprintf($iwlTemplate, $shortcut, urldecode($matches['URL']));
                }
                if (!empty($matches['QUERY'])) {
                    return sprintf($iwlTemplate, $shortcut, urldecode($matches['QUERY']));
                }
                // blanket cover of other placeholders
                if (!empty($matches[1])) {
                    return sprintf($iwlTemplate, $shortcut, $matches[1]);
                }
            }
        }
        // no pattern match found
        return $url;
    }
}
