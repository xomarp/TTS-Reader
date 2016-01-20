
'use strict';

angular.module('connexionServices', [])
  
	.service('FileDAO', function ($http){
		
		this.uploadFile = function(fileForm){
			
			return $http.post("/upload", fileForm, {
				withCredentials: true,
				headers: {'Content-Type': undefined},
				transformRequest: angular.identity
			});
		}
		
		this.getRecentFiles = function(){
			
			return $http({
				method: 'POST',
				url: '/getRecentFiles',
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			});
		}
		
		this.readFile = function(file_name){
			
			var xsrf = $.param({'file_name': file_name});
			return $http({
				method: 'POST',
				url: '/readFile/'+file_name,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				data: xsrf
			});
		}
		
		this.updateRecentFiles = function(files){
	
			var xsrf = $.param(files);
			
			return $http({
				url: '/updateRecentsFiles',
				method: 'POST',
				data: files,
				headers: {
					"contentType": 'application/json',
				}
			});
		}
	})
	
	.service('PlayerDAO', function ($http){
		
		this.getAudio = function(sentence){
			
			var xsrf = $.param(sentence);
			return $http({
				url: '/speak',
				method: 'POST',
				data: xsrf,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			});
		}
	});
