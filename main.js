/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {

    var ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
		CommandManager      = brackets.getModule("command/CommandManager"),
		DocumentManager     = brackets.getModule("document/DocumentManager"),
		KeyBindingManager   = brackets.getModule('command/KeyBindingManager'),
		NodeConnection      = brackets.getModule("utils/NodeConnection"),
		nodeConnection      = new NodeConnection(),
		domainPath          = ExtensionUtils.getModulePath(module) + "domain",
		ButtonHTML = '<a id="open-idle-btn" href="#" title="Open in IDLE"></a>',
		curOpenDir,
        curOpenFile,
        curOpenLang,
        cmd = '';

	function _processCmdOutput(data) {
		data = JSON.stringify(data);
		data = data
			.replace(/\\r/g, '\r')
			.replace(/\\n/g, '\n')
			.replace(/\"/g, '')
			.replace(/\\t/g, '\t');
		return data;
    }
	
    function handle() {
        CommandManager.execute("file.saveAll")
        curOpenDir  = DocumentManager.getCurrentDocument().file._parentPath;
        curOpenFile = DocumentManager.getCurrentDocument().file._path;
        curOpenLang = DocumentManager.getCurrentDocument().language._name;
		
		if (curOpenLang != 'Python') {
			console.log('[[open-idle]] can only open python files in IDLE');
			return false;
		}

        nodeConnection.connect(true).fail(function (err) {
            console.error("[[open-idle]] Cannot connect to node: ", err);
        }).then(function () {
            console.log('opening ' + curOpenLang + ' in ' + curOpenFile + '...\n');

            return nodeConnection.loadDomains([domainPath], true).fail(function (err) {
                console.error("[[open-idle]] Cannot register domain: ", err);
            });
        }).then(function () {
			// run this command
            cmd = 'idle '+curOpenFile;
        }).then(function () {
            nodeConnection.domains["open.idle"].exec(curOpenDir, cmd)
            .fail(function (err) {
				console.log(_processCmdOutput(err));
                alert(_processCmdOutput(err));
            })
        }).done();
    }
	
	ExtensionUtils.loadStyleSheet(module, "ui.css");	
	//CommandManager.register('Open idle', 'open.idle', handle);
	$('#main-toolbar .buttons').append(ButtonHTML);
	$( "#open-idle-btn" ).click(function() {
		handle();
	});
	
});
