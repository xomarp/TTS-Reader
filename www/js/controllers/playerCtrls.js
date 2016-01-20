
'use strict';

angular.module('playerCtrls', ['ngSanitize', 'connexionServices', 'ui.bootstrap-slider'])	
	
	.controller('playerController', function($scope, $rootScope, $sce, $http, $timeout, $interval, 
										$log, FileDAO, PlayerDAO){
		
		// CURRENT READER
		$rootScope.loading={}
		$rootScope.loading.isTXT=false;
		$rootScope.loading.isPDF=false;
		
		// FORMULAIRES
		$scope.dataForm={};
		$scope.dataForm.selectedText = '';		// SENTENCE SELECTED - HIGHLIGHTED
		$scope.dataForm.srcFile='';				// CURRENT TXT FILE SOURCE
		$scope.dataForm.volume=3;				// CURRENT VOLUME
		$scope.dataForm.playbackRate=10;		// CURRENT playbackRate
		
		$scope.fileForm={};
		$scope.fileForm.files=[];				// RECENTS FILES
		
		$scope.playerForm={};					
		$scope.playerForm.player = new Audio();		// NEW AUDIO PLAYER
		$scope.playerForm.src="";					// AUDIO SRC
		$scope.playerForm.player.volume=0.3;
		$scope.playerForm.speed=150;
		$scope.playerForm.documentMode=true;		// WILL PLAY DOCUMENT NOW
		$scope.playerForm.isDocInReset=false;		// WILL RESET PLAY DOCUMENT
		$scope.playerForm.isSenInReset=false;		// WILL RESET PLAY SENTENCE
		$scope.playerForm.isPlaying=false;			// CONROL PLAY/PAUSE ICONS
		$scope.playerForm.displayUpload=true;		// CONROL UPLOAD/SEARCH ICONS
		$scope.txtPageContent='';					// CONTENT FILE TXT
		
		// PDF CONTROLLER
		$scope.isLoading = false;
		$scope.downloadProgress = 0;
		$scope.pdfZoomLevels = [];
		$scope.pdfViewerAPI = {};
		$scope.pdfScale = 1;
		$scope.pdfURL = "";
		$scope.pdfFile = null;
		$scope.pdfTotalPages = 0;
		$scope.pdfCurrentPage = 0;
		$scope.pdfPageContent="";
		$scope.pdfSearchTerm = "";
		$scope.pdfSearchResultID = 0;
		$scope.pdfSearchNumOccurences = 0;
		$scope.pdfRendredText = "";
		
		// INCREASE-DECREASE FONT-SIZE
		$rootScope.fontSize = 13;
		$rootScope.incFont = function(){
			$rootScope.fontSize++;
		};	
		$rootScope.decFont = function(){
			$rootScope.fontSize--;
		};
		
		// SET VOLUME
		$rootScope.setVolume = function(){
			var volume=Number($scope.dataForm.volume)/10;
			$scope.playerForm.player.volume=volume;
			console.log("New volume : "+$scope.playerForm.player.volume);
		};
		
		// SET SPEECH RATE
		$rootScope.setSpeechRate = function(){
			var playbackRate=Number($scope.dataForm.playbackRate)/10;
			$scope.playerForm.player.playbackRate=playbackRate;
			console.log("New playbackRate : "+$scope.playerForm.player.playbackRate);
		}
		
		// INCREASE-DECREASE SPEED
		$rootScope.incSpeed = function(){
			if($scope.playerForm.player.playbackRate >= (2.0))
				return;
			$scope.playerForm.player.playbackRate+=0.1;
		}
		$rootScope.decSpeed = function(){
			if($scope.playerForm.player.playbackRate < (-1.0))
				return;
			$scope.playerForm.player.playbackRate-=0.1;
		}
			
		// STOP PLAYING
		$rootScope.stop = function(){
			// PAUSE PLAYING
			$rootScope.pause();
			if($scope.playerForm.player.currentTime)
				$scope.playerForm.player.currentTime=0.0;
			// RESET PLAY DOCUMENT (IF IS PLAYING)
			$scope.playerForm.isDocInReset=true;
			// RESET PLAY SENTENCE (IF IS PLAYING)
			$scope.playerForm.isSenInReset=true;
			// UNDO SELECTION
			if($rootScope.loading.isTXT){ // IN TEXT PAGE
				var iframeDoc = document.getElementById("frameX").contentDocument;
				if(iframeDoc && iframeDoc.getSelection())
					iframeDoc.getSelection().removeAllRanges();
			}
				
			else // IN PDF PAGE
				undoHighlighInLayer();
		}
		
		// PAUSE PLAYING
		$rootScope.pause= function(){
			$scope.playerForm.player.pause();
			$scope.playerForm.isDocInReset=false;
			$scope.playerForm.isSenInReset=false;
		}
		
		// PLAY/RESUME PLAYING
		$rootScope.play= function(){
			// CHECK IF A SENTENCE IS SELECTED
			if($scope.playerForm.documentMode){
				if($scope.playerForm.isDocInReset)
					$scope.playWholeDocument();
				else
					$scope.playerForm.player.play();
			}
			else{
				if($scope.playerForm.isSenInReset)
					$scope.speakSentence($scope.dataForm.selectedText);
				else
					$scope.playerForm.player.play();
			}
		}
		
		// GET FILE CONTENT
		$scope.loadFile= function(file_name){
			
			console.log("file_name : "+file_name);
			FileDAO.readFile(file_name)
				.success(function(resp){
					
					// SET TEXT IN TEXT-AREA
					$scope.dataForm.text=resp;
				})
				.error(function(err){
					console.log("error : "+err);
				});
		}
		
		// MANAGE AUDIO SRC
		$scope.trustSrc = function(src){
			return $sce.trustAsResourceUrl(src);
		}
		
		// SEND SENTENCE TO SERVER
		$scope.speakSentence= function(txt){
			if(!txt || typeof txt === 'undefined')
				return;
			
			var sentence=txt.replace(/#/g, " ");
			var obj={'text': sentence+"."};
			PlayerDAO.getAudio(obj)
				.success(function(resp){
					if(resp){
						
						// SET SENTENCE HIGHLIGHTED
						if($rootScope.loading.isTXT){
							setHighlightedText(txt);
						}
						else{
							setSentenceInHighligh(txt);
						}
						// UPDATE CURRENT AUDIO SRC
						$scope.playerForm.src=resp;
						//$scope.playerForm.player.src=$scope.trustSrc($scope.playerForm.src);
						$scope.playerForm.player.src=$scope.trustSrc('cache/sound.wav');
						console.log("new source: "+$scope.playerForm.player.src);
						// PLAY !!
						$scope.playerForm.player.play();
					}
				})
				.error(function(err){
					console.log("error speakWord: "+err);
				});
		}
		
		// GET FILE IN I-FRAME
		$scope.loadFileInFrame= function(file_name){
			
			// DISPLAY DOCUMENT
			var ext=file_name.split('.').pop();
			if(String(ext).toLowerCase() === 'pdf'){
				$rootScope.loading.isTXT=false;
				$scope.loadPDF('./uploads/'+file_name);
			}
			else{
				$rootScope.loading.isTXT=true;
				$scope.dataForm.srcFile='./uploads/'+file_name;
			}
			// RESET MODE
			$scope.playerForm.documentMode=true;
			$rootScope.stop();	
		}
		
		// variable passed to app controller
		$scope.$on('fileForm', function (evt, file){
			if(typeof file !== 'undefined'){
				console.log("name : "+file['name']);
				$scope.fileForm.file = file;
			}
			
		});
		$scope.$on('textForm', function (evt, text, spans){
			//console.log('textForm: '+text);
			$scope.pdfRendredText=text;
			$scope.spans=spans;
			//console.log("spans: "+spans.length);
		});
		$scope.$watch('pdfSearchTerm', function (input){
			
			if($rootScope.loading.isTXT){ // MODE TEXT DOCUMENT
				setHighlightedText(input);
			}
		});
		
		// UPLOAD FILE TO SERVER
		$scope.uploadFile= function(){
			console.log("Je suis dans uploadFile");
			console.log("fileForm.file: "+JSON.stringify($scope.fileForm.file));
			if(typeof $scope.fileForm.file === 'undefined')
				return;
			
			/** FILE TO BASE-64
			var reader = new FileReader();
			reader.onload = function(evt) {
				var fileData = evt.target.result;
				console.log("file[64]: "+fileData);
				
				$scope.loading.isTXT=true;
				$scope.dataForm.srcFile=$scope.trustSrc(fileData);
				$scope.$apply();
			};
			reader.readAsDataURL($scope.fileForm.file);
			return;**/
			
			var fd = new FormData();
			//Take the first selected file
			fd.append("file", $scope.fileForm.file);
			console.log("FormData: "+JSON.stringify(fd));
			FileDAO.uploadFile(fd)
				.success(function(resp){
					console.log("success : uploadFile");
					// LOAD NEW LIST
					$scope.loadListFiles();
				})
				.error(function(err){
					console.log("error uploadFile: "+err);
				});
		}
		
		// UPDATE RECENT FILES
		$scope.loadListFiles= function(){
			if(typeof $scope.fileForm.file === 'undefined')
				return;
			
			if(typeof $scope.fileForm.files === 'undefined')
				$scope.fileForm.files=[];
			$scope.fileForm.files.unshift({'file': $scope.fileForm.file['name']});
			
			console.log("files: "+JSON.stringify($scope.fileForm.files[0]));
			// UPDATE LIST
			FileDAO.updateRecentFiles(JSON.stringify($scope.fileForm.files))
				.success(function(resp){
					console.log("success : updateRecentFiles");
				})
				.error(function(err){
					console.log("error : "+err);
				});
		}
		
		$scope.loadFileContent= function(){
			
			// GET FIRST PAGE CONTENT
			if($rootScope.loading.isTXT){
				var iBody = $("#frameX").contents().find("body");
				var myContent = iBody.find("pre");
				var text=myContent.html();
				$scope.txtPageContent=text;
			}
			else{
				$scope.txtPageContent=$scope.pdfRendredText;
			}
		}
		
		var iLine=0;
		$scope.playWholeDocument= function(){
	
			// READER CORE
			console.log("READER CORE -  BEGIN");
			var sentences=[];
			var lines=[];
			
			$scope.loadFileContent();
			
			// sentences=$scope.txtPageContent.split(/[.:?!#]+/);
			sentences=$scope.txtPageContent.split(/[.?!:\r\n]+/);
			console.log("sentences: "+sentences.length);
				
			var iSentence=0;
			// LOGGER
			$log.info(iSentence+": "+sentences[iSentence]);
			//PLAY FIRST SENTENCE
			$scope.speakSentence(sentences[iSentence]);
			$scope.playerForm.player.onended=function(){
				if(iSentence<sentences.length){
					iSentence++;
					$log.info("Next: "+iSentence+": "+sentences[iSentence]);
					// BIND NEXT ONE
					if(typeof sentences[iSentence] !== 'undefined' && sentences[iSentence].trim() !== "" && sentences[iSentence].trim() !== "#")
						$scope.speakSentence(sentences[iSentence].trim());
				}
			};			
		}
		
		$scope.displayControl= function(){
			$scope.playerForm.displayUpload ^= true; // XOR
			if($scope.playerForm.displayUpload)
				$('#uploadTools').css('background-color', '#ddd');
			else
				$('#uploadTools').css('background-color', '#fff');
		}
		
		$scope.init= function(){
			FileDAO.getRecentFiles()
				.success(function(resp){
					
					if(typeof resp !== 'undefined'){
						console.log("getRecentFiles: "+JSON.stringify(resp));
						$scope.fileForm.files=resp;
					}
				})
				.error(function(err){
					console.log("error : "+err);
				});
		}
						
		$(":file").filestyle({buttonBefore: true});
		$scope.playerForm.player.onplay=function(){
			// ICONS
			$scope.playerForm.isPlaying=true;
			$scope.playerForm.player.playbackRate=Number($scope.dataForm.playbackRate)/10;
			$scope.$apply();	
		}
		$scope.playerForm.player.onpause=function(){
			// ICONS
			$scope.playerForm.isPlaying=false;
			$scope.$apply();	
		}
		$scope.playerForm.player.onstop=function(){
			// ICONS
			$scope.playerForm.isPlaying=false;
			$scope.playerForm.player.src="";
			$scope.$apply();
		}
		$scope.playerForm.player.onended=function(){
			// ICONS
			$scope.playerForm.isPlaying=false;
			$scope.playerForm.player.src="";
			$scope.$apply();	
		}

		// UNDO HIGHLIGHT FOR PDF
		function undoHighlighInLayer(){
			$('#XLayer').find('span.highlight').each(function(){
				var $this=$(this);
				$this.replaceWith($this[0].textContent);
			});
		}
		
		// HIGHLIGHT FOR PDF
		function setSentenceInHighligh(sentence){
			$log.info('setSentenceInHighligh : '+sentence);
			if(typeof $scope.spans === 'undefined' || $scope.spans.length == 0){
				$log.info('setTextInHighligh : $scope.spans undefined !!');
				return;
			}
			// RESET HIGHLIGHT LAYER
			undoHighlighInLayer();
			
			var $spans=$('#XLayer').children('span');
			// DIVIDE SENTENCE
			var lines=[];
			lines=sentence.split(/[#]+/);
			console.log('lines: '+lines.length);
			
			for(var i=0; i<$scope.spans.length; i++){
				// SPAN CONTENT
				var content=$scope.spans[i];
				//console.log(content+' : '+lines[0]+' : '+content.indexOf(lines[0].trim()));
				if(content.indexOf(lines[0].trim())>=0){
					if(lines.length == 1){ // WHOLE SENTENCE IN ONE LINE
						var newC=content.replace(lines[0], "<span class='highlight'>"+lines[0]+"</span>");
						// REPLACE
						$spans[i].innerHTML=newC;		
						//console.log('['+i+'] WOOW, We got it !!');
						break;
					}
					if(lines.length>1){ // SENTENCE DIVIDED IN MANY LINES
						if($scope.spans[i+1].indexOf(lines[1].trim())>=0){
							//console.log('['+(i-1)+','+i+'] WOOW, We got it !!');
							for(var j=0; j<lines.length; j++){
								var newC='';
								if(j === 0){
									newC=$scope.spans[i+j].replace(new RegExp(lines[j] + '$'), "<span class='highlight'>"+lines[j]+"</span>");
									//newC=$scope.spans[i+j].replaceLast(lines[j], "<span class='highlight'>"+lines[j]+"</span>");
								}else{
									newC=$scope.spans[i+j].replace(lines[j], "<span class='highlight'>"+lines[j]+"</span>");
								}
								// REPLACE
								$spans[i+j].innerHTML=newC;
							}
							break;
						}
					}
				}
			}
			
			// SCROLL
			$(".highlight").get(0).scrollIntoView();
			/**$('html, body').animate({
				scrollTop: $('.highlight').offset().top
			}, 2000);**/
		}
		
		// HIGHLIGHT FOR TXT
		function setHighlightedText(txt){
			
			if(!txt)
				return;
			
			var iframe = document.getElementById("frameX");
			var iframeDoc = iframe.contentDocument; //iframe.contentWindow.document;
			
			// LOAD PAGE CONTENT
			$scope.loadFileContent();
			
			// GET COORDONNEES - SENTENCE
			var jStart=$scope.txtPageContent.indexOf(txt);
			var jEnd=jStart+txt.length;
			
			//console.log('Position['+txt+']['+jStart+', '+jEnd+']');
			if(jStart === -1)
				return;
			
			var rang = iframeDoc.createRange();
			rang.setStart(iframeDoc.body.childNodes[0].firstChild, jStart);
			rang.setEnd(iframeDoc.body.childNodes[0].firstChild, jEnd);//jEnd+1);
			var selection = iframe.contentWindow.getSelection();
			
			// APPLY SELECTION
			selection.removeAllRanges();
			selection.addRange(rang);
			// SET FOCUS
			iframe.focus();
		}
		
		// PDF CONTROLLER
		$scope.onPDFProgress = function (operation, state, value, total, message) {
			console.log("onPDFProgress(" + operation + ", " + state + ", " + value + ", " + total + ")");			
			if(operation === "render" && value === 1) {
				if(state === "success") {
					
					if($scope.pdfZoomLevels.length === 0) {
						// Read all the PDF zoom levels in order to populate the combobox...
						var lastScale = 0.1;
						do {
							var curScale = $scope.pdfViewerAPI.getNextZoomInScale(lastScale);
							if(curScale.value === lastScale) {
								break;
							}

							$scope.pdfZoomLevels.push(curScale);

							lastScale = curScale.value;
						} while(true);
					}
					
					// BIND TEXT LAYER
					$('#XLayer')[0].onmouseup=function(){
						// UNDO ALL SELECTION
						undoHighlighInLayer();
						var selection = rangy.getSelection($('#XLayer')[0]);
						if(String(selection).trim() !== ""){ 
							// HERE IS HIGHLIGHTED SENTENCE TO PLAY
							$scope.dataForm.selectedText=String(selection).trim();
							// RESET PLAYER
							$scope.playerForm.documentMode=false;
							$rootScope.stop();
						}
							
					}
					$scope.pdfCurrentPage = 1;
					$scope.pdfTotalPages = $scope.pdfViewerAPI.getNumPages();
					$scope.pageContent = $scope.pdfViewerAPI.getPageContent();
					$scope.pdfScale = $scope.pdfViewerAPI.getZoomLevel();
					$scope.isLoading = false;
				} else {
					alert("Failed to render 1st page!\n\n" + message);
					$scope.isLoading = false;
				}
			} else if(operation === "download" && state === "loading") {
				$scope.downloadProgress = (value / total) * 100.0;
			} else {
				if(state === "failed") {
					alert("Something went really bad!\n\n" + message);
				}
			}
		};

		$scope.onPDFZoomLevelChanged = function (){
			$scope.pdfViewerAPI.zoomTo($scope.pdfScale);
		};

		$scope.onPDFPageChanged = function (){
			$scope.pdfViewerAPI.goToPage($scope.pdfCurrentPage);
		};

		$scope.zoomIn = function (){
//			console.log("zoomIn()");
			var nextScale = $scope.pdfViewerAPI.getNextZoomInScale($scope.pdfScale);
			$scope.pdfViewerAPI.zoomTo(nextScale.value);
			$scope.pdfScale = nextScale.value;
		};

		$scope.zoomOut = function (){
//			console.log("zoomOut()");
			var nextScale = $scope.pdfViewerAPI.getNextZoomOutScale($scope.pdfScale);
			$scope.pdfViewerAPI.zoomTo(nextScale.value);
			$scope.pdfScale = nextScale.value;
		};

		$scope.loadPDF = function (pdfURL){
			if($scope.pdfURL === pdfURL) {
				return;
			}
			
			/** GET PDF CONTENT
			pdfToText(pdfURL).then(function(result) {
				// $scope.pdfRendredText=result.replace(/\t/g, ' ');
				$scope.pdfRendredText=result.replace(/\s\s/g, '#');
				//console.log('result: '+result);
				console.log('pdfRendredText: '+$scope.pdfRendredText);
			});**/
		
			$scope.isLoading = true;
			$scope.downloadProgress = 0;
			$scope.pdfZoomLevels = [];
			$scope.pdfSearchTerm = "";
			$scope.pdfFile = null;
			$scope.pdfURL = pdfURL;
			// RESET ILine
			iLine=0;
		};
				
		$scope.findNext = function (){
			$scope.pdfViewerAPI.findNext();
		};
		
		$scope.findPrev = function (){
			$scope.pdfViewerAPI.findPrev();
		};

		$scope.onPDFFileChanged = function (){
			$scope.isLoading = true;
			$scope.downloadProgress = 0;
			$scope.pdfZoomLevels = [];
			$scope.pdfSearchTerm = "";

			$scope.$apply(function () {
				$scope.pdfURL = "";
				$scope.pdfFile = document.getElementById('file_input').files[0];
				console.log("pdf: "+$scope.pdfFile['name']);
			});
		};
		
		$scope.onPDFPassword = function (reason){
			return prompt("The selected PDF is password protected. PDF.js reason: " + reason, "");
		};

		$scope.switchToPDF = function (pdfID){
			if(pdfID === 0) {
				$scope.loadPDF("./pdf/demo.pdf");
			} else if(pdfID === 1) {
				$scope.loadPDF("./pdf/demo_large.pdf");
			}
		};

		$(function(){
			$("#container_pdf").hover(
				function(){
					$("#control_1").prependTo("#container_pdf").show();
				},
				function(){
					$("#control_1").hide();
				});
		});
	})
	;