import app from './app';
import {LayoutController} from './layout/layout.controller';

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider'], (
  stateProvider: ng.ui.IStateProvider,
  urlRouterProvider: ng.ui.IUrlRouterProvider,
  locationProvider: ng.ILocationProvider
) => {
  urlRouterProvider.otherwise('/');
  locationProvider.html5Mode(true);

  stateProvider
    .state('layout', {
      abstract: true,
      templateUrl: 'layout/layout.html',
      controller: LayoutController,
      controllerAs: '$ctrl'
    })
    .state('layout.home', {
      url: '/',
      templateUrl: 'home/home.html',
      data: {
        label: 'Home'
      }
    });
});
