export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounts_customer_profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at: string
          display_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_customer_pr_user_id_6caccc54_fk_accounts_"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          role: string
          supabase_user_id: string
          updated_at: string
        }
        Insert: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          role: string
          supabase_user_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          role?: string
          supabase_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          address_line1: string
          address_line2: string
          address_type: string
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          landmark: string
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2: string
          address_type?: string
          city: string
          country?: string
          created_at: string
          full_name: string
          id: string
          is_default?: boolean
          landmark: string
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string
          address_type?: string
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          landmark?: string
          phone?: string
          postal_code?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_d930d1dc_fk_accounts_users_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_group: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      auth_group_permissions: {
        Row: {
          group_id: number
          id: number
          permission_id: number
        }
        Insert: {
          group_id: number
          id?: number
          permission_id: number
        }
        Update: {
          group_id?: number
          id?: number
          permission_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "auth_permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_group_permissions_group_id_b120cbf9_fk_auth_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "auth_group"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_permission: {
        Row: {
          codename: string
          content_type_id: number
          id: number
          name: string
        }
        Insert: {
          codename: string
          content_type_id: number
          id?: number
          name: string
        }
        Update: {
          codename?: string
          content_type_id?: number
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_permission_content_type_id_2f476e4b_fk_django_co"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "django_content_type"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_user: {
        Row: {
          date_joined: string
          email: string
          first_name: string
          id: number
          is_active: boolean
          is_staff: boolean
          is_superuser: boolean
          last_login: string | null
          last_name: string
          password: string
          username: string
        }
        Insert: {
          date_joined: string
          email: string
          first_name: string
          id?: number
          is_active: boolean
          is_staff: boolean
          is_superuser: boolean
          last_login?: string | null
          last_name: string
          password: string
          username: string
        }
        Update: {
          date_joined?: string
          email?: string
          first_name?: string
          id?: number
          is_active?: boolean
          is_staff?: boolean
          is_superuser?: boolean
          last_login?: string | null
          last_name?: string
          password?: string
          username?: string
        }
        Relationships: []
      }
      auth_user_groups: {
        Row: {
          group_id: number
          id: number
          user_id: number
        }
        Insert: {
          group_id: number
          id?: number
          user_id: number
        }
        Update: {
          group_id?: number
          id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_user_groups_group_id_97559544_fk_auth_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "auth_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_user_groups_user_id_6a12ed8b_fk_auth_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_user_user_permissions: {
        Row: {
          id: number
          permission_id: number
          user_id: number
        }
        Insert: {
          id?: number
          permission_id: number
          user_id: number
        }
        Update: {
          id?: number
          permission_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "auth_permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_carts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          session_key: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at: string
          id: string
          is_active: boolean
          session_key?: string | null
          updated_at: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          session_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_carts_user_id_7c14a699_fk_accounts_users_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          quantity: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at: string
          id: string
          quantity: number
          updated_at: string
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_54d2714b_fk_cart_carts_id"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_6e25bb33_fk_catalog_product_variants_id"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          image_alt: string
          image_public_id: string
          image_url: string
          is_active: boolean
          is_visible_on_storefront: boolean
          name: string
          ordering: number
          parent_id: string | null
          short_description: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at: string
          description: string
          id: string
          image_alt: string
          image_public_id: string
          image_url: string
          is_active: boolean
          is_visible_on_storefront: boolean
          name: string
          ordering: number
          parent_id?: string | null
          short_description: string
          slug: string
          updated_at: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_alt?: string
          image_public_id?: string
          image_url?: string
          is_active?: boolean
          is_visible_on_storefront?: boolean
          name?: string
          ordering?: number
          parent_id?: string | null
          short_description?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_parent_id_465ddc09_fk_catalog_categories_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_collections: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_media_assets: {
        Row: {
          alt_text: string
          bytes: number | null
          created_at: string
          format: string
          height: number | null
          id: string
          image_url: string
          original_filename: string
          public_id: string
          resource_type: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text: string
          bytes?: number | null
          created_at: string
          format: string
          height?: number | null
          id: string
          image_url: string
          original_filename: string
          public_id: string
          resource_type: string
          updated_at: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          bytes?: number | null
          created_at?: string
          format?: string
          height?: number | null
          id?: string
          image_url?: string
          original_filename?: string
          public_id?: string
          resource_type?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      catalog_product_collections: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          is_active: boolean
          ordering: number
          product_id: string
        }
        Insert: {
          collection_id: string
          created_at: string
          id: string
          is_active: boolean
          ordering: number
          product_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          ordering?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_product_coll_collection_id_f5a1cb26_fk_catalog_c"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "catalog_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_product_coll_product_id_02e6bf25_fk_catalog_p"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_product_images: {
        Row: {
          alt_text: string
          bytes: number | null
          created_at: string
          format: string
          height: number | null
          id: string
          image_url: string
          is_primary: boolean
          ordering: number
          product_id: string
          public_id: string
          resource_type: string
          width: number | null
        }
        Insert: {
          alt_text: string
          bytes?: number | null
          created_at: string
          format: string
          height?: number | null
          id: string
          image_url: string
          is_primary: boolean
          ordering: number
          product_id: string
          public_id: string
          resource_type: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          bytes?: number | null
          created_at?: string
          format?: string
          height?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean
          ordering?: number
          product_id?: string
          public_id?: string
          resource_type?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_product_imag_product_id_2f5b27e9_fk_catalog_p"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_product_variants: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          retail_price: number
          sale_price: number | null
          size: string
          sku: string
          updated_at: string
          wholesale_price: number | null
        }
        Insert: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          retail_price: number
          sale_price?: number | null
          size: string
          sku: string
          updated_at: string
          wholesale_price?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          retail_price?: number
          sale_price?: number | null
          size?: string
          sku?: string
          updated_at?: string
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_product_vari_product_id_1dfa6284_fk_catalog_p"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_category_id_7daa0652_fk_catalog_categories_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      django_admin_log: {
        Row: {
          action_flag: number
          action_time: string
          change_message: string
          content_type_id: number | null
          id: number
          object_id: string | null
          object_repr: string
          user_id: number
        }
        Insert: {
          action_flag: number
          action_time: string
          change_message: string
          content_type_id?: number | null
          id?: number
          object_id?: string | null
          object_repr: string
          user_id: number
        }
        Update: {
          action_flag?: number
          action_time?: string
          change_message?: string
          content_type_id?: number | null
          id?: number
          object_id?: string | null
          object_repr?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "django_admin_log_content_type_id_c4bce8eb_fk_django_co"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "django_content_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "django_admin_log_user_id_c564eba6_fk_auth_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      django_content_type: {
        Row: {
          app_label: string
          id: number
          model: string
        }
        Insert: {
          app_label: string
          id?: number
          model: string
        }
        Update: {
          app_label?: string
          id?: number
          model?: string
        }
        Relationships: []
      }
      django_migrations: {
        Row: {
          app: string
          applied: string
          id: number
          name: string
        }
        Insert: {
          app: string
          applied: string
          id?: number
          name: string
        }
        Update: {
          app?: string
          applied?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      django_session: {
        Row: {
          expire_date: string
          session_data: string
          session_key: string
        }
        Insert: {
          expire_date: string
          session_data: string
          session_key: string
        }
        Update: {
          expire_date?: string
          session_data?: string
          session_key?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          alert_acknowledged_at: string | null
          created_at: string
          id: string
          is_alert_acknowledged: boolean
          low_stock_threshold: number
          quantity_available: number
          quantity_reserved: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          alert_acknowledged_at?: string | null
          created_at: string
          id: string
          is_alert_acknowledged: boolean
          low_stock_threshold: number
          quantity_available: number
          quantity_reserved: number
          updated_at: string
          variant_id: string
        }
        Update: {
          alert_acknowledged_at?: string | null
          created_at?: string
          id?: string
          is_alert_acknowledged?: boolean
          low_stock_threshold?: number
          quantity_available?: number
          quantity_reserved?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_variant_id_71489de9_fk_catalog_p"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "catalog_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          actor_email: string
          actor_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          inventory_item_id: string
          movement_type: string
          note: string
          quantity_change: number
          reason_code: string
          reference: string
          resulting_quantity: number | null
        }
        Insert: {
          actor_email: string
          actor_id?: string | null
          created_at: string
          id: string
          idempotency_key: string
          inventory_item_id: string
          movement_type: string
          note: string
          quantity_change: number
          reason_code: string
          reference: string
          resulting_quantity?: number | null
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          inventory_item_id?: string
          movement_type?: string
          note?: string
          quantity_change?: number
          reason_code?: string
          reference?: string
          resulting_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_actor_id_fe77431f_fk_accounts_users_id"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_5331fb59_fk_inventory"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          inventory_item_id: string
          order_id: string | null
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at: string
          expires_at?: string | null
          id: string
          inventory_item_id: string
          order_id?: string | null
          quantity: number
          status: string
          updated_at: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          inventory_item_id?: string
          order_id?: string | null
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservatio_inventory_item_id_64793410_fk_inventory"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_id_ef4f42a9_fk_orders_id"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address_snapshot: Json
          cart_id: string | null
          created_at: string
          currency: string
          discount: number
          id: string
          idempotency_key: string | null
          order_number: string
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          shipping_address_snapshot: Json
          shipping_amount: number
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address_snapshot?: Json
          cart_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id: string
          idempotency_key?: string | null
          order_number: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          shipping_address_snapshot?: Json
          shipping_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address_snapshot?: Json
          cart_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          idempotency_key?: string | null
          order_number?: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          shipping_address_snapshot?: Json
          shipping_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_audit_logs: {
        Row: {
          actor_email: string
          actor_id: string | null
          created_at: string
          from_status: string
          id: string
          note: string
          operation_type: string
          order_id: string
          to_status: string
        }
        Insert: {
          actor_email: string
          actor_id?: string | null
          created_at: string
          from_status: string
          id: string
          note: string
          operation_type: string
          order_id: string
          to_status: string
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          from_status?: string
          id?: string
          note?: string
          operation_type?: string
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_audit_logs_actor_id_e43b287e_fk_accounts_users_id"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_audit_logs_order_id_0a8540da_fk_orders_id"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_coupon_audit_logs: {
        Row: {
          actor_email: string
          actor_id: string | null
          coupon_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          notes: string
        }
        Insert: {
          actor_email: string
          actor_id?: string | null
          coupon_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          notes: string
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          coupon_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_audit__coupon_id_b88805c3_fk_orders_co"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "orders_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_audit_logs_actor_id_9b8d7684_fk_accounts_users_id"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_coupons: {
        Row: {
          code: string
          created_at: string
          created_by_id: string | null
          currency: string
          description: string
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean
          is_first_order_only: boolean
          max_discount_amount: number | null
          min_order_subtotal: number | null
          name: string
          per_customer_limit: number | null
          start_date: string
          updated_at: string
          updated_by_id: string | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at: string
          created_by_id?: string | null
          currency: string
          description: string
          discount_type: string
          discount_value: number
          end_date?: string | null
          id: string
          is_active: boolean
          is_first_order_only: boolean
          max_discount_amount?: number | null
          min_order_subtotal?: number | null
          name: string
          per_customer_limit?: number | null
          start_date: string
          updated_at: string
          updated_by_id?: string | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by_id?: string | null
          currency?: string
          description?: string
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_first_order_only?: boolean
          max_discount_amount?: number | null
          min_order_subtotal?: number | null
          name?: string
          per_customer_limit?: number | null
          start_date?: string
          updated_at?: string
          updated_by_id?: string | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupons_created_by_id_af89ce72_fk_accounts_users_id"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupons_updated_by_id_ceb538bc_fk_accounts_users_id"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_items: {
        Row: {
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price: number
          variant_id: string | null
          variant_name: string
        }
        Insert: {
          id: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku?: string
          unit_price: number
          variant_id?: string | null
          variant_name?: string
        }
        Update: {
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string
          unit_price?: number
          variant_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_shipment_audit_logs: {
        Row: {
          actor_email: string
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: string
          id: string
          metadata: Json
          note: string
          shipment_id: string
          to_status: string
        }
        Insert: {
          actor_email: string
          actor_id?: string | null
          created_at: string
          event_type: string
          from_status: string
          id: string
          metadata: Json
          note: string
          shipment_id: string
          to_status: string
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string
          id?: string
          metadata?: Json
          note?: string
          shipment_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipment_audi_actor_id_894d0e26_fk_accounts_"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipment_audi_shipment_id_8284a0c9_fk_orders_sh"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "orders_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_shipments: {
        Row: {
          carrier: string
          created_at: string
          created_by_id: string | null
          delivered_at: string | null
          delivered_by_id: string | null
          dispatched_at: string | null
          dispatched_by_id: string | null
          id: string
          internal_note: string
          order_id: string
          status: string
          tracking_number: string
          tracking_url: string
          updated_at: string
        }
        Insert: {
          carrier: string
          created_at: string
          created_by_id?: string | null
          delivered_at?: string | null
          delivered_by_id?: string | null
          dispatched_at?: string | null
          dispatched_by_id?: string | null
          id: string
          internal_note: string
          order_id: string
          status: string
          tracking_number: string
          tracking_url: string
          updated_at: string
        }
        Update: {
          carrier?: string
          created_at?: string
          created_by_id?: string | null
          delivered_at?: string | null
          delivered_by_id?: string | null
          dispatched_at?: string | null
          dispatched_by_id?: string | null
          id?: string
          internal_note?: string
          order_id?: string
          status?: string
          tracking_number?: string
          tracking_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipments_created_by_id_954d51a0_fk_accounts_users_id"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipments_delivered_by_id_951bcdb4_fk_accounts_users_id"
            columns: ["delivered_by_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipments_dispatched_by_id_3dd3082e_fk_accounts_users_id"
            columns: ["dispatched_by_id"]
            isOneToOne: false
            referencedRelation: "accounts_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipments_order_id_2814b531_fk_orders_id"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
