#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
商品属性模板管理API
提供商品类型模板和自定义字段的CRUD接口
"""

from flask import request, jsonify
import json

# 这些函数将被app.py导入使用

def register_product_template_routes(app, get_db_connection):
    """注册商品属性模板相关路由"""
    
    # ==================== 商品类型模板管理 ====================
    
    @app.route('/api/product-templates', methods=['GET'])
    def get_product_templates():
        """获取商品类型模板列表"""
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM product_type_templates WHERE is_active=1 ORDER BY sort_order")
                templates = cursor.fetchall()
            conn.close()
            return jsonify({'success': True, 'data': templates})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/api/product-templates', methods=['POST'])
    def add_product_template():
        """新增商品类型模板"""
        try:
            data = request.json
            conn = get_db_connection()
            with conn.cursor() as cursor:
                sql = """INSERT INTO product_type_templates 
                         (type_name, type_code, description, sort_order) 
                         VALUES (%s, %s, %s, %s)"""
                cursor.execute(sql, (
                    data.get('type_name'),
                    data.get('type_code'),
                    data.get('description'),
                    data.get('sort_order', 0)
                ))
                template_id = cursor.lastrowid
                conn.commit()
            conn.close()
            return jsonify({'success': True, 'id': template_id})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/api/product-templates/<int:template_id>', methods=['PUT'])
    def update_product_template(template_id):
        """更新商品类型模板"""
        try:
            data = request.json
            conn = get_db_connection()
            with conn.cursor() as cursor:
                sql = """UPDATE product_type_templates 
                         SET type_name=%s, description=%s, sort_order=%s 
                         WHERE id=%s"""
                cursor.execute(sql, (
                    data.get('type_name'),
                    data.get('description'),
                    data.get('sort_order', 0),
                    template_id
                ))
                conn.commit()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/api/product-templates/<int:template_id>', methods=['DELETE'])
    def delete_product_template(template_id):
        """删除商品类型模板（软删除）"""
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute("UPDATE product_type_templates SET is_active=0 WHERE id=%s", (template_id,))
                conn.commit()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    # ==================== 自定义字段管理 ====================
    
    @app.route('/api/product-templates/<int:template_id>/fields', methods=['GET'])
    def get_template_fields(template_id):
        """获取模板的自定义字段"""
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM product_custom_fields WHERE template_id=%s ORDER BY sort_order",
                    (template_id,)
                )
                fields = cursor.fetchall()
            conn.close()
            return jsonify({'success': True, 'data': fields})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/api/product-fields', methods=['POST'])
    def add_product_field():
        """新增自定义字段"""
        try:
            data = request.json
            conn = get_db_connection()
            with conn.cursor() as cursor:
                sql = """INSERT INTO product_custom_fields 
                         (template_id, field_name, field_label, field_type, field_options,
                          is_required, default_value, placeholder, sort_order, validation_rule) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
                
                # 处理field_options（如果是list转为JSON字符串）
                field_options = data.get('field_options')
                if isinstance(field_options, list):
                    field_options = json.dumps(field_options, ensure_ascii=False)
                
                cursor.execute(sql, (
                    data.get('template_id'),
                    data.get('field_name'),
                    data.get('field_label'),
                    data.get('field_type'),
                    field_options,
                    data.get('is_required', 0),
                    data.get('default_value'),
                    data.get('placeholder'),
                    data.get('sort_order', 0),
                    data.get('validation_rule')
                ))
                field_id = cursor.lastrowid
                conn.commit()
            conn.close()
            return jsonify({'success': True, 'id': field_id})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/api/product-fields/<int:field_id>', methods=['PUT'])
    def update_product_field(field_id):
        """更新自定义字段"""
        try:
            data = request.json
            conn = get_db_connection()
            with conn.cursor() as cursor:
                # 处理field_options
                field_options = data.get('field_options')
                if isinstance(field_options, list):
                    field_options = json.dumps(field_options, ensure_ascii=False)
                
                sql = """UPDATE product_custom_fields 
                         SET field_label=%s, field_type=%s, field_options=%s,
                             is_required=%s, default_value=%s, placeholder=%s,
                             sort_order=%s, validation_rule=%s
                         WHERE id=%s"""
                cursor.execute(sql, (
                    data.get('field_label'),
                    data.get('field_type'),
                    field_options,
                    data.get('is_required', 0),
                    data.get('default_value'),
                    data.get('placeholder'),
                    data.get('sort_order', 0),
                    data.get('validation_rule'),
                    field_id
                ))
                conn.commit()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/api/product-fields/<int:field_id>', methods=['DELETE'])
    def delete_product_field(field_id):
        """删除自定义字段"""
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM product_custom_fields WHERE id=%s", (field_id,))
                conn.commit()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    # ==================== 商品自定义字段值 ====================
    
    @app.route('/api/services/<int:service_id>/custom-fields', methods=['GET'])
    def get_service_custom_fields(service_id):
        """获取商品的自定义字段值"""
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                sql = """SELECT cfv.*, cf.field_name, cf.field_label, cf.field_type
                         FROM product_custom_field_values cfv
                         JOIN product_custom_fields cf ON cfv.field_id = cf.id
                         WHERE cfv.service_id = %s"""
                cursor.execute(sql, (service_id,))
                fields = cursor.fetchall()
            conn.close()
            return jsonify({'success': True, 'data': fields})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/api/services/<int:service_id>/custom-fields', methods=['POST'])
    def save_service_custom_fields(service_id):
        """保存商品的自定义字段值（批量）"""
        try:
            data = request.json
            custom_fields = data.get('custom_fields', {})
            
            conn = get_db_connection()
            with conn.cursor() as cursor:
                for field_id, field_value in custom_fields.items():
                    # 使用REPLACE实现upsert
                    sql = """INSERT INTO product_custom_field_values 
                             (service_id, field_id, field_value) 
                             VALUES (%s, %s, %s)
                             ON DUPLICATE KEY UPDATE field_value=%s"""
                    cursor.execute(sql, (service_id, field_id, field_value, field_value))
                conn.commit()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
