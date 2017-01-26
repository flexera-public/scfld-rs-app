import ng from 'angular';
import '../';
import { LayoutController } from './layout.controller';

describe(LayoutController.name, () => {

  let controllerService: ng.IControllerService;
  let controller: LayoutController;

  beforeEach(ng.mock.module('<%= moduleName %>'));

  beforeEach(inject(['$controller', ($controller: ng.IControllerService) => {
    controllerService = $controller;
    controller = <LayoutController>controllerService(LayoutController.name);
  }]));

  it('should expose states to the view', () => {
    expect(controller.states).toBeDefined();
  });
});
