
'use strict';

var app = angular.module('readerApp', ['indexCtrls', 'playerCtrls', 'angular-pdf-viewer']);
	
app
	.run(function($rootScope){
		// RECENTS FILES
		$rootScope.recentFiles=[];
	})
	.directive("fileread", ['$timeout', function ($timeout){
		return {
			scope: {
				fileread: "="
			},
			link: function (scope, element, attributes){
				element.bind("change", function (changeEvent){
					var reader = new FileReader();
					reader.onload = function (loadEvent){
						scope.$apply(function (){
							scope.fileread = loadEvent.target.result;
							//console.log("Directive : "+scope.fileread);
							
							//scope.fileForm=scope.fileread;
							scope.fileForm=changeEvent.target.files[0];
							
							// wait until after $apply
							$timeout(function(){
								//console.log("$timeout : "+scope.fileread);
								// use scope.$emit to pass it to controller
								scope.$emit('fileForm', scope.fileForm);
							});
						});
					}
					reader.readAsDataURL(changeEvent.target.files[0]);
				});
			},
			// the variable is available in directive controller,
			// and can be fetched as done in link function
			controller: ['$scope', function ($scope){
				// wait until after $apply
				$timeout(function(){
					//console.log("$timeout_2 : "+$scope.fileread);
					// use $scope.$emit to pass it to controller
					$scope.$emit('fileForm', $scope.fileForm);
				});
			}]
		}
	}])
	.directive('updateBodyStyle', ['$timeout', function ($timeout){
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var $body = $(element).contents().find('body');
				var $div = $(element).contents().find('#viewer');
				// GET SELECTED TEXT
				$div.on('mouseup', function(){
					selection = rangy.getSelection($body[0]);
					console.log("selection3 : "+selection);
				});
				
				$(element).load(function(){
					// cached body element overrides when src loads
					// hence have to cache it again 
					console.log("attrs : "+JSON.stringify(attrs.updateBodyStyle));
					$body = $(element).contents().find('body');
					$body.css(scope.$eval(attrs.updateBodyStyle));
					
					function getSelectionText(){
						var text = "";
						win = $(element).contentWindow || $(element);
						doc = $(element).contents() || $(element).contents().document;
  
						if(win.getSelection) {
							text = win.getSelection().toString();
						}else if(doc.selection && doc.selection.type != "Control"){
							text = doc.selection.createRange().text;
						}
						return text;
					}
					
					// GET SELECTED TEXT
					$body.on('mouseup', function(){
						
						var selection = rangy.getSelection($body[0]);
						if(selection){
							scope.selected=selection;
							//console.log("selection2 : "+selection);
							// wait until after $apply
							$timeout(function(){
								// use scope.$emit to pass it to controller
								scope.$emit('selectForm', scope.selected);
							});
						}						
					});
					
					// MOZ-SELECTION
					$(element).contents().find("head")
						.append($("<style type='text/css'>  "+
							"pre::-moz-selection {color: red; background: yellow;}"+
							"pre::selection {color: red; background: yellow;}  </style>"));
					
				});
				
				attrs.$observe('updateBodyStyle', function(value) {
					$body.css(scope.$eval(value));
				}, true);
			}
		};
	}])
	.directive('watchSelection', ['$timeout', function ($timeout) {
        return function(scope, elem){
            elem.on('mouseup', function(){
				var selection = rangy.getSelection(elem[0]);
				console.log("selection : "+selection);
				scope.selected = selection;
				
				// wait until after $apply
				$timeout(function(){
					// use scope.$emit to pass it to controller
					scope.$emit('selectForm', scope.selected);
				});
            });
        }; 
    }])
	.directive('sibs', function() {
		return {
			link: function(scope, element, attrs) {
				element.bind('click', function() {
					element.parent().children().removeClass('active');
					element.addClass('active');
				})
			},
		}
	})
	.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

			$stateProvider
				.state('player', {
					url: '/player',
					templateUrl: 'templates/player.html',
					controller: 'playerController'
				})
		  $urlRouterProvider.otherwise('player');
		}
	]);