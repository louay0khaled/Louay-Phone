import ProductImageManager from '@/components/admin/ProductImageManager';

export default function AdminImagesPage() {
  return <section className="p-5 lg:p-10"><div className="mb-7"><p className="text-xs font-black tracking-[.18em] text-sky-300">MEDIA CONTROL</p><h1 className="mt-2 text-3xl font-black">إدارة صور المنتجات</h1><p className="mt-2 text-sm leading-7 text-slate-500">مكان واحد لفحص الصور التالفة، إصلاحها، وتعبئة الصور الناقصة تلقائيًا مع بقاء القرار بيد المسؤول.</p></div><ProductImageManager /></section>;
}
