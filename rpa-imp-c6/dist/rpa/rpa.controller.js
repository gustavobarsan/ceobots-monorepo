"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpaController = void 0;
const common_1 = require("@nestjs/common");
const rpa_service_1 = require("./rpa.service");
const start_rpa_dto_1 = require("./dto/start-rpa.dto");
let RpaController = class RpaController {
    rpaService;
    constructor(rpaService) {
        this.rpaService = rpaService;
    }
    start(startRpaDto) {
        this.rpaService.startExtraction(startRpaDto).catch(() => {
        });
        return {
            status: 'running',
            message: 'C6 RPA pipeline started successfully in background',
        };
    }
    stop() {
        this.rpaService.stopAll();
        return {
            status: 'stopped',
            message: 'C6 RPA processing was aborted by request',
        };
    }
};
exports.RpaController = RpaController;
__decorate([
    (0, common_1.Post)('start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_rpa_dto_1.StartRpaDto]),
    __metadata("design:returntype", void 0)
], RpaController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('stop'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RpaController.prototype, "stop", null);
exports.RpaController = RpaController = __decorate([
    (0, common_1.Controller)('rpa'),
    __metadata("design:paramtypes", [rpa_service_1.RpaService])
], RpaController);
//# sourceMappingURL=rpa.controller.js.map