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
	"use strict";
	
    var FileSystem          = brackets.getModule("filesystem/FileSystem"),
		FileUtils           = brackets.getModule("file/FileUtils"),
		ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
		CommandManager      = brackets.getModule("command/CommandManager"),
		DocumentManager     = brackets.getModule("document/DocumentManager"),
		KeyBindingManager   = brackets.getModule('command/KeyBindingManager'),
		NodeConnection      = brackets.getModule("utils/NodeConnection"),
		nodeConnection      = new NodeConnection(),
		domainPath          = ExtensionUtils.getModulePath(module) + "domain",
		IDLEHTML = '<a id="open-idle-btn" href="#" title="Open in IDLE"></a>',
		TerminalHTML = '<a id="open-terminal-btn" href="#" title="Open Terminal"></a>',
		curOpenDir,
		curOpenFile,
		curOpenLang,
		cmd = '';
	
	function replaceAll(s,k,v) {
		while (s.indexOf(k) > -1) {
			s = s.replace(k,v);
		}
		return s;
	}
	
	function procc(k,s) {
		if(typeof(k[0]) != 'object') {
			k = [k];
		}
		for (var x = 0; x < k.length; x++) {
			if (k[x].length == 2) {
				s = replaceAll(s,'{'+k[x][0]+'}',k[x][1]);
			} else {
				s = replaceAll(s,'{'+k[x][0]+'}',k[x][0]);
			}
		}
		while (s.indexOf('{') > -1) {
			s = s.replace(/{.*?}/, '');
		}
		return s;
	}

	function _processCmdOutput(data) {
		data = JSON.stringify(data);
		data = data
			.replace(/\\r/g, '\r')
			.replace(/\\n/g, '\n')
			.replace(/\"/g, '')
			.replace(/\\t/g, '\t');
		return data;
	}

	function handle(cmd,lang) {
		curOpenDir  = DocumentManager.getCurrentDocument().file._parentPath;
		curOpenFile = DocumentManager.getCurrentDocument().file._path;
		curOpenLang = DocumentManager.getCurrentDocument().language._name;

		if(lang != '') {
			console.log('lang', lang, curOpenLang);
			if (curOpenLang != lang) {
				cmd = cmd.split(' ')[0];
			} else {
				cmd = cmd.replace('$file',curOpenFile);
			}
		}
		
		cmd = 'open -a '+cmd;

		nodeConnection.connect(true).fail(function (err) {
			console.error("[[open-idle]] Cannot connect to node: ", err);
		}).then(function () {
			return nodeConnection.loadDomains([domainPath], true).fail(function (err) {
				console.error("[[open-idle]] Cannot register domain: ", err);
			});
		}).then(function () {
			console.log('>>'+cmd);
		}).then(function () {
			nodeConnection.domains["open.idle"].exec(curOpenDir, cmd)
			.fail(function (err) {
				console.log(_processCmdOutput(err));
				alert(_processCmdOutput(err));
			})
		}).done();
	}

	if (ExtensionUtils.getModulePath(module).substr(0,1) != "/") {
		console.log('[[open-app]] must be used on mac os only');
	} else {
		
		var file = FileSystem.getFileForPath(ExtensionUtils.getModulePath(module)+'apps.txt');
		var promise = FileUtils.readAsText(file);  // completes asynchronously
		promise.done(function (text) {

			var apphtml = '<a data-command="{app}{ $file}" data-lang="{lang}" id="open-{app}-btn" class="open-app-button" href="#" title="Open {with }{app}">{text}</a>',
				apps = [],
				line = [],
				q = [];
			
			text = text.replace(' ','').split('\n');
			for (var i = 0; i < text.length; i++) {
				if(text[i][0] != '#') {
					line = text[i].replace(' ','').trim().split(',');
					q = [['app',line[0]]];
					if (line.length == 1 || line[1] != 'icon') {
						q.push(['text',line[0]]);
					}
					if(line.length == 3) {
						q.push(['with ']);
						q.push([' $file']);
						q.push(['lang',line[2].trim()]);
					}
					apps.push( procc( q, apphtml) );
					console.log(apps[apps.length-1]);
				}
			}
			
			ExtensionUtils.loadStyleSheet(module, "ui.css");
			
			for (var i = 0; i < apps.length; i++) {
				$('#main-toolbar .buttons').append(apps[i]);
				$('#'+apps[i].substr( apps[i].indexOf('" id="')+6 , apps[i].indexOf('" class="')-apps[i].indexOf('" id="')-6 )).click(function() {
					handle( this.getAttribute('data-command'), this.getAttribute('data-lang') );
				});
			}
		})
		.fail(function (errorCode) {
			console.log("[[open-app]] file error: " + errorCode);  // one of the FileSystemError constants
		});
	}
});