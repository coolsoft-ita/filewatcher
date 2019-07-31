// Attach to document ready event
$(document).ready(function() {

  // load settings
  chrome.storage.local.get(['enabled', 'rules'], function(settings) {
    $('#chkEnabled').prop('checked', settings.enabled);
  });

  $('#chkEnabled').change(function(){
    chrome.storage.local.set({ enabled: this.checked });
    window.close();
  });

  // Open configuration page upon click on "Configuration" button
  $('#cmdConfigure').click(function() {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Open help page upon click on "Help" button
  $('#cmdHelp').click(function(){
    OpenHelpWindow();
    window.close();
  });

});