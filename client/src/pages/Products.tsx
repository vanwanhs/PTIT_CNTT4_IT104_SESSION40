/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Image,
  Input,
  Modal,
  Pagination,
  Select,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import type { Category, Product } from "../utils/type";

type ProductStatus = "active" | "inactive";

type ProductRow = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category: string;
  price: number;
  image: string;
  status: ProductStatus;
};

export default function Products() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "">("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [url, setUrl] = useState<string>("");
  const pageSize = 5;

  const getAllCategories = async () => {
    try {
      const response = await axios.get("http://localhost:8080/categories");
      setCategories(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getAllProduct = async () => {
    try {
      const res = await axios.get("http://localhost:8080/products");
      const mapped = res.data.map((p: any) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        return { ...p, category: cat ? cat.name : "" };
      });
      setRows(mapped);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getAllCategories();
  }, []);

  useEffect(() => {
    if (categories.length) getAllProduct();
  }, [categories]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const image: any = e.target.files?.[0];
    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", "test111111");
    formData.append("cloud_name", "da3olfyka");
    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/da3olfyka/image/upload`,
        formData
      );
      setUrl(response.data.url);
    } catch (error) {
      console.log(error);
    }
  };

  const addProduct = async (new_product: Product) => {
    try {
      const response = await axios.post(
        "http://localhost:8080/products",
        new_product
      );
      const cat = categories.find((c) => c.id === response.data.categoryId);
      setRows([...rows, { ...response.data, category: cat ? cat.name : "" }]);
    } catch (error) {
      console.log(error);
    }
  };

  const updateProduct = async (id: string, product: Product) => {
    try {
      const response = await axios.put(
        `http://localhost:8080/products/${id}`,
        product
      );
      const cat = categories.find((c) => c.id === response.data.categoryId);
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...response.data, category: cat ? cat.name : "" } : r
        )
      );
    } catch (error) {
      console.log(error);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await axios.delete(`http://localhost:8080/products/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.log(error);
    }
  };

  const filtered = useMemo(() => {
    let data = rows
      .filter((r) =>
        search
          ? (r.name + r.code).toLowerCase().includes(search.toLowerCase())
          : true
      )
      .filter((r) => (statusFilter ? r.status === statusFilter : true));
    if (sortField) {
      data = [...data].sort((a, b) => {
        const v1: any = (a as any)[sortField];
        const v2: any = (b as any)[sortField];
        if (v1 < v2) return sortOrder === "asc" ? -1 : 1;
        if (v1 > v2) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [rows, search, statusFilter, sortField, sortOrder]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const columns: ColumnsType<ProductRow> = [
    { title: "Mã", dataIndex: "code", key: "code", width: 120, sorter: true },
    { title: "Tên", dataIndex: "name", key: "name", sorter: true },
    { title: "Danh mục", dataIndex: "category", key: "category", width: 160 },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      width: 140,
      sorter: true,
      render: (v: number) => v.toLocaleString() + " đ",
    },
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 120,
      render: (src: string) => (src ? <Image src={src} width={56} /> : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => (s === "active" ? "Hoạt động" : "Ngừng"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" type="primary" onClick={() => onEdit(record)}>
            Sửa
          </Button>
          <Button size="small" danger onClick={() => deleteProduct(record.id)}>
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  function onAdd() {
    setEditing(null);
    setUrl("");
    setOpen(true);
  }

  function onEdit(row: ProductRow) {
    setEditing(row);
    setUrl("");
    setOpen(true);
  }

  interface ProductFormValues {
    code: string;
    name: string;
    category: string;
    price: number | string;
    status: ProductStatus;
  }

  function onSubmit(values: ProductFormValues) {
    const next: any = {
      ...editing,
      name: values.name,
      categoryId: values.category,
      price: Number(values.price) || 0,
      image: url || editing?.image,
      status: values.status,
    };
    if (editing) {
      updateProduct(editing.id, next);
    } else {
      addProduct(next);
    }
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">ứng dụng Quản lý sản phẩm</div>
        <Button type="primary" onClick={onAdd}>
          Thêm mới
        </Button>
      </div>

      <div className="flex justify-end gap-3">
        <Select
          placeholder="Trạng thái"
          className="min-w-40"
          allowClear
          value={statusFilter || undefined}
          onChange={(v) => setStatusFilter((v as ProductStatus) || "")}
          options={[
            { value: "active", label: "Hoạt động" },
            { value: "inactive", label: "Ngừng hoạt động" },
          ]}
        />
        <Input
          style={{ width: "300px" }}
          placeholder="Tìm kiếm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={paged}
        pagination={false}
        rowKey="id"
        onChange={(pagination, filters, sorter: any) => {
          if (sorter.order) {
            setSortField(sorter.field);
            setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
          } else {
            setSortField("");
            setSortOrder("");
          }
        }}
      />

      <div className="flex justify-end">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={filtered.length}
          onChange={setPage}
        />
      </div>

      <Modal
        title={editing ? "Sửa sản phẩm" : "Thêm mới sản phẩm"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          onFinish={onSubmit}
          initialValues={
            editing
              ? { ...editing, category: editing.categoryId }
              : { status: "active" }
          }
        >
          <Form.Item
            name="name"
            label="Tên"
            rules={[{ required: true, message: "Nhập tên" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            label="Danh mục"
            rules={[{ required: true, message: "Chọn danh mục" }]}
          >
            <Select
              options={categories.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              placeholder="Nhập tên danh mục"
            />
          </Form.Item>
          <Form.Item
            name="price"
            label="Giá"
            rules={[{ required: true, message: "Nhập giá" }]}
          >
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item name="image" label="Ảnh">
            <Input type="file" onChange={handleChange} />
            {(url || editing?.image) && (
              <Image src={url || editing?.image} width={80} />
            )}
          </Form.Item>
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "active", label: "Hoạt động" },
                { value: "inactive", label: "Ngừng" },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Lưu
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
