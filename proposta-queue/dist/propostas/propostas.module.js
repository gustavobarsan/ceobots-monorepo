"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropostasModule = void 0;
const common_1 = require("@nestjs/common");
const propostas_service_1 = require("./propostas.service");
const propostas_controller_1 = require("./propostas.controller");
const db_module_1 = require("../db/db.module");
const queue_module_1 = require("../queue/queue.module");
let PropostasModule = class PropostasModule {
};
exports.PropostasModule = PropostasModule;
exports.PropostasModule = PropostasModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule, queue_module_1.QueueModule],
        providers: [propostas_service_1.PropostasService],
        controllers: [propostas_controller_1.PropostasController],
        exports: [propostas_service_1.PropostasService]
    })
], PropostasModule);
//# sourceMappingURL=propostas.module.js.map