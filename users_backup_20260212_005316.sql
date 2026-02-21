-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: ajkuaiji
-- ------------------------------------------------------
-- Server version	8.0.36

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系手机',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门',
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '岗位',
  `project` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '项目',
  `area` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '区域',
  `alias` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'enabled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_department` (`department`),
  KEY `idx_area` (`area`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','123321','系统管理员',NULL,NULL,NULL,NULL,NULL,NULL,'super_admin',1,'enabled','2026-02-08 17:39:13','2026-02-09 04:10:25'),(2,'ajadmin','123456','AJ管理员',NULL,NULL,NULL,NULL,NULL,NULL,'admin',1,'enabled','2026-02-08 17:39:13','2026-02-08 17:39:13'),(3,'zhangsan','123456','张三',NULL,NULL,NULL,NULL,NULL,'小张','operation',1,'enabled','2026-02-08 17:39:13','2026-02-08 17:39:13'),(4,'lisi','123456','李四',NULL,NULL,NULL,NULL,NULL,'小李','financial',1,'enabled','2026-02-08 17:39:13','2026-02-08 17:39:13'),(5,'wangwu','123456','王五',NULL,NULL,NULL,NULL,NULL,'小王','operation',1,'enabled','2026-02-08 17:39:13','2026-02-08 17:39:13'),(6,'zhaoliu','123456','赵六',NULL,NULL,NULL,NULL,NULL,'小赵','viewer',1,'enabled','2026-02-08 17:39:13','2026-02-08 17:39:13'),(13,'test_admin','123456','测试管理员',NULL,NULL,NULL,NULL,NULL,NULL,'admin',1,'enabled','2026-02-10 16:35:04','2026-02-10 16:35:04'),(14,'test_finance','123456','测试财务',NULL,NULL,NULL,NULL,NULL,NULL,'financial',1,'enabled','2026-02-10 16:35:04','2026-02-10 16:35:04'),(15,'test_operation','123456','测试运营',NULL,NULL,NULL,NULL,NULL,NULL,'operation',1,'enabled','2026-02-10 16:35:04','2026-02-10 16:35:04'),(16,'test_viewer','123456','测试观察员',NULL,NULL,NULL,NULL,NULL,NULL,'viewer',1,'enabled','2026-02-10 16:35:04','2026-02-10 16:35:04');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-12  0:53:16
