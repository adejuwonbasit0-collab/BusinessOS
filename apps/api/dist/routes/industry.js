"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const IndustryController_1 = require("../controllers/IndustryController");
const authenticate_1 = require("../middleware/authenticate");
const middleware_1 = require("../middleware");
const validation_1 = require("../lib/validation");
const router = (0, express_1.Router)();
const ctrl = new IndustryController_1.IndustryController();
router.use(authenticate_1.authenticate, middleware_1.rateLimiter);
router.get('/', ctrl.listPresets);
router.get('/modules', ctrl.listModules);
router.get('/current', ctrl.getCurrentConfig);
router.post('/select', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), (0, validation_1.requireFields)('industryKey'), ctrl.selectIndustry);
router.post('/custom', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), (0, validation_1.requireFields)('name'), ctrl.createCustomIndustry);
router.patch('/modules', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), ctrl.toggleModule);
exports.default = router;
//# sourceMappingURL=industry.js.map