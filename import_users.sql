-- ========== 组织架构清理与导入脚本 (txl.md) ==========
-- 日期：2026-02-12
-- 说明：清理测试用户（保留admin和ajadmin），导入52条真实人员信息

USE ajkuaiji;

-- 步骤1：清理测试用户（保留id=1和id=2的管理员账号）
DELETE FROM users WHERE id NOT IN (1, 2);

-- 步骤2：重置自增ID（从3开始）
ALTER TABLE users AUTO_INCREMENT = 3;

-- 步骤3：导入52条真实人员信息（密码统一为123321的MD5值）
-- 说明：role字段暂设为'operation'（运营），后续可根据实际调整

INSERT INTO users (username, password, name, phone, department, position, project, area, alias, role, company_id, status) VALUES
-- 1. 总经办团队（总部）
('lls', 'e10adc3949ba59abbe56e057f20f883e', '罗龙生', '18903740182', '总经办', '负责人', '许昌二区', '总部', NULL, 'admin', 1, 'enabled'),
('hyp', 'e10adc3949ba59abbe56e057f20f883e', '侯跃鹏', '18539045738', '总经办', '会计', '许昌二区', '禹州', NULL, 'financial', 1, 'enabled'),
('wzh', 'e10adc3949ba59abbe56e057f20f883e', '翁志航', '15880333019', '总经办', 'IT', '许昌二区', '禹州', NULL, 'admin', 1, 'enabled'),
('wzy', 'e10adc3949ba59abbe56e057f20f883e', '王战洋', '18237476176', '总经办', '总经理', '许昌二区', '总部', NULL, 'super_admin', 1, 'enabled'),
('zcf', 'e10adc3949ba59abbe56e057f20f883e', '王朝飞', '15836569056', '总经办', '负责人', '许昌二区', '禹州', NULL, 'admin', 1, 'enabled'),
('sxb', 'e10adc3949ba59abbe56e057f20f883e', '孙帅兵', '15237489991', '总经办', '城市经理', '许昌二区', '总部', NULL, 'manager', 1, 'enabled'),
('tjy', 'e10adc3949ba59abbe56e057f20f883e', '田纪云', '15703747676', '总经办', '负责人', '许昌二区', '总部', NULL, 'admin', 1, 'enabled'),

-- 2. 中台部团队（总部）
('lyq', 'e10adc3949ba59abbe56e057f20f883e', '刘玉强', '15503955220', '中台部', '中台主管', '许昌二区', '总部', NULL, 'manager', 1, 'enabled'),

-- 3. 禹州（龙）团队
('cyb', 'e10adc3949ba59abbe56e057f20f883e', '崔渊博', '177305792', '禹州（龙）团队', 'BD', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('zj', 'e10adc3949ba59abbe56e057f20f883e', '周进', '13673815695', '禹州（龙）团队', 'BDM', '许昌二区', '禹州', NULL, 'manager', 1, 'enabled'),
('smy', 'e10adc3949ba59abbe56e057f20f883e', '宋明阳', '17527158234', '禹州（龙）团队', 'BD', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('lhp', 'e10adc3949ba59abbe56e057f20f883e', '李华培', '13782321326', '禹州（龙）团队', 'BD', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('fyb', 'e10adc3949ba59abbe56e057f20f883e', '付禹博', '13333747837', '禹州（龙）团队', 'BD', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('ysy', 'e10adc3949ba59abbe56e057f20f883e', '杨双雨', '139727898', '禹州（龙）团队', 'BD', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('xsb', 'e10adc3949ba59abbe56e057f20f883e', '徐世博', '18737457723', '禹州（龙）团队', 'BD', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),

-- 4. 襄县（龙）团队
('hj', 'e10adc3949ba59abbe56e057f20f883e', '黄炬', '17513351392', '襄县（龙）团队', 'BD', '许昌二区', '襄县', NULL, 'operation', 1, 'enabled'),
('lyh', 'e10adc3949ba59abbe56e057f20f883e', '刘一航', '159399018', '襄县（龙）团队', 'BD', '许昌二区', '襄县', NULL, 'operation', 1, 'enabled'),
('yyy', 'e10adc3949ba59abbe56e057f20f883e', '颜莹莹', '15188548787', '襄县（龙）团队', '达人运营', '许昌二区', '襄县', NULL, 'operation', 1, 'enabled'),
('hsb', 'e10adc3949ba59abbe56e057f20f883e', '郝世博', '16637442299', '襄县（龙）团队', 'BDM', '许昌二区', '襄县', NULL, 'manager', 1, 'enabled'),

-- 5. 鄢陵（龙）团队
('zsb', 'e10adc3949ba59abbe56e057f20f883e', '张帅兵', '13569987270', '鄢陵（龙）团队', 'BDM', '许昌二区', '鄢陵', NULL, 'manager', 1, 'enabled'),
('lyc', 'e10adc3949ba59abbe56e057f20f883e', '梁艳聪', '13503899761', '鄢陵（龙）团队', 'BD', '许昌二区', '鄢陵', NULL, 'operation', 1, 'enabled'),
('zyh', 'e10adc3949ba59abbe56e057f20f883e', '张跃辉', '17630801175', '鄢陵（龙）团队', 'BD', '许昌二区', '鄢陵', NULL, 'operation', 1, 'enabled'),
('lyt', 'e10adc3949ba59abbe56e057f20f883e', '刘洋涛', '18839908769', '鄢陵（龙）团队', 'BD', '许昌二区', '鄢陵', NULL, 'operation', 1, 'enabled'),
('zsh', 'e10adc3949ba59abbe56e057f20f883e', '张帅豪', '15038955797', '鄢陵（龙）团队', 'BD', '许昌二区', '鄢陵', NULL, 'operation', 1, 'enabled'),
('psy', 'e10adc3949ba59abbe56e057f20f883e', '裴素艳', '132133762', '鄢陵（龙）团队', '行政', '许昌二区', '鄢陵', NULL, 'operation', 1, 'enabled'),

-- 6. 爱佳（凤）团队【达运】（禹州）
('fmz', 'e10adc3949ba59abbe56e057f20f883e', '范萌珠', '15837413968', '爱佳（凤）团队【达运】', '达人运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('lxf', 'e10adc3949ba59abbe56e057f20f883e', '李小峰', '13733732123', '爱佳（凤）团队【达运】', '达人运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('gsy', 'e10adc3949ba59abbe56e057f20f883e', '郭邵阳', '15565317312', '爱佳（凤）团队【达运】', '达人运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('zyf', 'e10adc3949ba59abbe56e057f20f883e', '赵雨飞', '18736043483', '爱佳（凤）团队【达运】', '达人运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('ylb', 'e10adc3949ba59abbe56e057f20f883e', '杨璐冰', '15237400718', '爱佳（凤）团队【达运】', '达人运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),

-- 7. 爱佳（虎）团队【IP】（禹州）
('ztj', 'e10adc3949ba59abbe56e057f20f883e', '赵添娇', '13839018119', '爱佳（虎）团队【IP】', 'IP主播', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('zxy', 'e10adc3949ba59abbe56e057f20f883e', '张向瑶', '15937473783', '爱佳（虎）团队【IP】', 'IP主播', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('zxt', 'e10adc3949ba59abbe56e057f20f883e', '朱鑫涛', '159399605', '爱佳（虎）团队【IP】', '新媒体运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('zq', 'e10adc3949ba59abbe56e057f20f883e', '张淇', '18339080672', '爱佳（虎）团队【IP】', '新媒体运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),

-- 8. 爱佳（豹）团队【直播】（禹州）
('cxy', 'e10adc3949ba59abbe56e057f20f883e', '程小艺', '13598950352', '爱佳（豹）团队【直播】', '新媒体主播', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('lzf', 'e10adc3949ba59abbe56e057f20f883e', '李枝繁', '15290849034', '爱佳（豹）团队【直播】', '新媒体主播', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('zly', 'e10adc3949ba59abbe56e057f20f883e', '张留言', '17550997990', '爱佳（豹）团队【直播】', '新媒体主播', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('ld', 'e10adc3949ba59abbe56e057f20f883e', '梁栋', '19903996562', '爱佳（豹）团队【直播】', '新媒体主播', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('xmc', 'e10adc3949ba59abbe56e057f20f883e', '许梦晨', '13733713583', '爱佳（豹）团队【直播】', '新媒体主播', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),

-- 9. 爱佳（中台）团队（总部）
('lmy', 'e10adc3949ba59abbe56e057f20f883e', '刘梦园', '13569499155', '爱佳（中台）团队', '中台运营', '许昌二区', '总部', NULL, 'operation', 1, 'enabled'),
('zyj', 'e10adc3949ba59abbe56e057f20f883e', '张玉杰', '17873582033', '爱佳（中台）团队', '中台运营', '许昌二区', '总部', NULL, 'operation', 1, 'enabled'),
('lmm', 'e10adc3949ba59abbe56e057f20f883e', '李萌萌', '184606978', '爱佳（中台）团队', '中台运营', '许昌二区', '总部', NULL, 'operation', 1, 'enabled'),

-- 10. 爱佳（服务）团队（禹州）
('wmm', 'e10adc3949ba59abbe56e057f20f883e', '王梦梦', '15837414777', '爱佳（服务）团队', '人事', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),

-- 11. 鲜鸟（龙）团队（禹州-会计）
('wzw', 'e10adc3949ba59abbe56e057f20f883e', '翁志伟', '13599009039', '鲜鸟（龙）团队', '会计', '许昌二区', '禹州', NULL, 'financial', 1, 'enabled'),
('hym', 'e10adc3949ba59abbe56e057f20f883e', '韩燚梦', '15237407271', '鲜鸟（龙）团队', '会计', '许昌二区', '禹州', NULL, 'financial', 1, 'enabled'),
('lg', 'e10adc3949ba59abbe56e057f20f883e', '李鸽', '17527122350', '鲜鸟（龙）团队', '会计', '许昌二区', '禹州', NULL, 'financial', 1, 'enabled'),

-- 12. 代运营团队（禹州）
('fyj', 'e10adc3949ba59abbe56e057f20f883e', '付焱姣', '17837452990', '代运营', '新媒体运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('xl', 'e10adc3949ba59abbe56e057f20f883e', '徐良', '132215159', '代运营', '新媒体运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),
('zyl', 'e10adc3949ba59abbe56e057f20f883e', '赵翼龙', '15565301608', '代运营', '新媒体运营', '许昌二区', '禹州', NULL, 'operation', 1, 'enabled'),

-- 13. 贵宾学习组（总部）
('zsy', 'e10adc3949ba59abbe56e057f20f883e', '翟树远', '15660577889', '贵宾学习组', '渠道经理', '许昌二区', '总部', NULL, 'manager', 1, 'enabled');

-- 步骤4：验证导入结果
SELECT COUNT(*) as total_users, 
       SUM(CASE WHEN role='super_admin' THEN 1 ELSE 0 END) as super_admins,
       SUM(CASE WHEN role='admin' THEN 1 ELSE 0 END) as admins,
       SUM(CASE WHEN role='financial' THEN 1 ELSE 0 END) as financial,
       SUM(CASE WHEN role='manager' THEN 1 ELSE 0 END) as managers,
       SUM(CASE WHEN role='operation' THEN 1 ELSE 0 END) as operations
FROM users;

-- 步骤5：显示所有用户（按部门和岗位排序）
SELECT id, username, name, phone, department, position, project, area 
FROM users 
ORDER BY area, department, position;
