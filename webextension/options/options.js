$(document).ready(function(){

    // fields
    let tblRules = $('#tblRules');

    // update "Enabled" checkbox state upon settings change (it could be changed by popup)
    chrome.storage.onChanged.addListener(function (changes) {
        if (typeof changes.enabled !== 'undefined') {
            $('#chkEnabled').prop('checked', changes.enabled.newValue);
        }
    });

    // open the native app to test its version
    browser.runtime.sendNativeMessage(
        'filewatcher',
        { "msgId": "version" }
    ).then(
        // response...
        function(response){
            $('#native-wait').hide();
            NativeAppAvailable(response);
        },
        // error...
        function(error){
            $('#native-wait').hide();
            $('#native-error-message').text(error);
            $('#native-error').show();
        }
    );

    // load settings and update rules list
    chrome.storage.local.get(['enabled', 'rules', 'onlyIfFocused'], function(settings){
        if (settings.hasOwnProperty('rules')) {
            // stored objects could be "different" from current ones, so merge them
            var rules = {};
            var saved = JSON.parse(settings.rules || '{}');
            saved = typeof(saved) === 'object' ? saved : {};
            for (let id in saved) {
              rules[id] = Object.assign(new Rule(), saved[id]);
            }
            // update options page
            UpdateRulesList(rules);
        }
        $('#chkEnabled').prop('checked', settings.enabled);
        $('#chkOnlyIfFocused').prop('checked', settings.onlyIfFocused !== undefined ? settings.onlyIfFocused : true);
    });

    // attach events to UI elements
    $('#cmdSave').click(SaveConfiguration);
    $('#cmdAddNew').click(AddNewRule);
    $('#cmdHelp').click(OpenHelpWindow);
    $('#cmdReload').click(function () {
        location.reload();
    });
    $('#chkEnabled').change(function () { 
        chrome.storage.local.set({ enabled: this.checked });
    });


    /**
     * Read version info and show it to the user.
     * @returns {undefined}
     */
    function NativeAppAvailable(nativeVersion)
    {
        // set UI
        $('#info .field-version').html(nativeVersion.version);
        $('#info .field-protocolVersion').html(nativeVersion.protocolVersion);
        $('#info .field-executable').html(nativeVersion.executable);
        $('#info').show();
        $('#rules').show();
    }


    /**
     * Validate an HTML rule item, add error messages/classes and returns true
     * if the rule definition is valid, false otherwise.
     * If rules is set, then the ruleId uniqueness is also tested.
     *
     * @returns {Rule} Returns the defined rule or false;
     */
    function ValidateHTMLItem(htmlItem, rules = undefined)
    {
        let itemError = htmlItem.find('.rule-error');
        let rule = HTML2Rule(htmlItem);
        let ruleId = htmlItem.find('.field-ruleId').val();
        let validation = rule.Validate();

        // reset errors
        htmlItem.find('input').removeClass('rule-error');
        itemError.html('');
        itemError.hide();

        // validate ruleId field
        if (typeof rules !== 'undefined' && typeof rules[ruleId] !== 'undefined') {
            if (validation === true) {
                validation = {};
            }
            validation = { "ruleId": "Duplicate Rule ID" };
        }

        if (validation !== true) {
            $.each(validation, function(fieldName, errorText){
                htmlItem.find('.field-'+fieldName).addClass('rule-error');
                itemError.html(itemError.html() + '<div>' + errorText + '</div>');
                itemError.show();
        });
            return false;
        }
        else {
            return rule;
        }
    }


    /**
     * Return the HTML item containing the given ruleId
     */
    function FindRuleItem(ruleId)
    {
        let $found = null;
        $('.rule .field-ruleId').each(function(){
            if ($(this).val() == ruleId) {
                $found = $(this).closest('.rule');
                return false; // escape from each()
            }
        });
        return $found;
    }


    /**
     * Duplicate the given rule HTML item and add it after to source elem
     */
    function DuplicateRuleItem(ruleElem)
    {
        // duplicate source rule through HTML->Rule->HTML
        const clonedRule = HTML2Rule(ruleElem);
        // set random ruleId
        const clonedElem = Rule2HTML(GetNewRuleID(), clonedRule);

        // add new rule and select it
        ruleElem.after(clonedElem);
        clonedElem.find('.field-ruleId').focus().select();
    }


    /**
     * Add a new rule element to list
     */
    function AddNewRule()
    {
        // remove the .norules-tag item, if exists
        tblRules.children('.norules').remove();

        // add the new rule
        let ruleId = GetNewRuleID();
        let $newRuleItem = Rule2HTML(ruleId, new Rule());
        tblRules.append($newRuleItem);

        // give focus to the newly added rule
        $newRuleItem.find('.field-ruleId').focus().select();
    }


    /**
     * Returns a random ruleId
     */
    function GetNewRuleID()
    {
        return 'rule_' + new Date().getTime();
    }


    /**
     * Saves settings.
     */
    function SaveConfiguration()
    {  
        // save options
        chrome.storage.local.set({ onlyIfFocused: $('#chkOnlyIfFocused').prop('checked') });

        // build a new rules collection
        let rules = {};

        // scan rule HTML items and build rules
        let errorsFound = false;
        $('#tblRules .rule').each(function(){
            var item = $(this);
            var rule = ValidateHTMLItem(item, rules);
            if (rule === false) {
                // if the rule is invalid won't save
                errorsFound = true;
            }
            else {
                // save the rule
                var ruleId = item.find('.field-ruleId').val();
                rules[ruleId] = rule;
            }
        });

        // save rules and refresh the list
        if (!errorsFound) {
            chrome.storage.local.set({ rules: JSON.stringify(rules), saved: true });
            UpdateRulesList(rules || {});
        }

    }


    /**
     * Fills the rules list
     * @returns {undefined}
     */
    function UpdateRulesList(rules)
    {
        // cleanup
        tblRules.find('.rule').remove();

        // fill data
        $.each(rules, function(ruleId, rule){
            tblRules.append(Rule2HTML(ruleId, rule));
        });
        if (tblRules.children().length == 0) {
            tblRules.append($('#itemTemplateEmpty').html());
        }

    }


    /**
     * Return an HTML element with values from the given rule
     * or an empty (new) rule element.
     */
    function Rule2HTML(ruleId = undefined, rule = undefined)
    {
        let $template = $($('#itemTemplate').html());
        if (ruleId) {
            $template.find('.field-ruleId').val(ruleId);
            $.each(Object.keys(rule), function(index, key){
                var $elem = $template.find('.field-' + key).first();
                if ($elem.is(':checkbox')) {
                    $elem.prop('checked', rule[key]);
                }
                else {
                    $elem.val(rule[key]);
                }
            });
            $template.find('.cmdDuplicate').click(function(){
                DuplicateRuleItem($(this).closest('.rule'));
            });
            $template.find('.cmdDelete').click(function(){
                if (confirm('Delete this rule?')) {
                    $(this).closest('.rule').remove();
                }
            });
            $template.find('.cmdSelectDirectory').click(function () {
                SelectDirectory(ruleId);
            });
        }
        return $template;
    }


    /**
     * Return a rule object built from its HTML LI element.
     *
     * @returns {Rule}
     */
    function HTML2Rule(htmlItem)
    {
        let rule = new Rule();
        $.each(Object.keys(rule), function(index, key){
            var $elem = htmlItem.find('.field-' + key);
            if ($elem.length) {
                if ($elem.is(':checkbox')) {
                    rule[key] = $elem.prop('checked');
                }
                else {
                    rule[key] = $elem.val();
                }
            }
        });
        return rule;
    }


    /****************************************
     * Directory browser selector
     ****************************************/

    /**
     * Send a message to native app to show native directory selection dialog.
     */
    function SelectDirectory(ruleId)
    {
        let ruleItem = FindRuleItem(ruleId);
        let directory = ruleItem.find('.field-directory').val();

        // send the message to native app and wait for response
        browser.runtime.sendNativeMessage(
            'filewatcher',
            {
                msgId: "directorySelect",
                ruleId: ruleId,
                directory: directory,
            }
        )
        .then(
            // response...
            function (response) {
                switch (response.msgId) {
                    case "directorySelect":
                        if (response.directory) {
                            let ruleItem = FindRuleItem(response.ruleId);
                            if (ruleItem) {
                                ruleItem.find('.field-directory').val(response.directory);
                            }
                        }
                        break;
                    case "error":
                        ShowNativeError(response.message);
                        break;
                }
            }
        );
    }
});
