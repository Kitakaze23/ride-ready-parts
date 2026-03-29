import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X, Upload } from 'lucide-react';

export default function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'used'>('used');
  const [type, setType] = useState<'part' | 'motorcycle'>('part');
  const [city, setCity] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [compatList, setCompatList] = useState<{ brandId: string; modelId: string; brandName: string; modelName: string }[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').order('name');
      return data || [];
    },
  });

  const { data: models } = useQuery({
    queryKey: ['models', selectedBrandId],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data } = await supabase.from('models').select('*').eq('brand_id', selectedBrandId).order('name');
      return data || [];
    },
    enabled: !!selectedBrandId,
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  const addCompat = () => {
    if (!selectedBrandId) return;
    const brand = brands?.find((b: any) => b.id === selectedBrandId);
    const model = models?.find((m: any) => m.id === selectedModelId);
    if (brand) {
      setCompatList([...compatList, {
        brandId: brand.id,
        modelId: model?.id || '',
        brandName: brand.name,
        modelName: model?.name || '',
      }]);
      setSelectedBrandId('');
      setSelectedModelId('');
    }
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages([...images, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) { toast.error('Заполните обязательные поля'); return; }
    setLoading(true);

    try {
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          price: parseFloat(price),
          condition,
          type,
          city: city.trim() || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const path = `${user.id}/${listing.id}/${i}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('listings').upload(path, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('listings').getPublicUrl(path);
          await supabase.from('listing_images').insert({
            listing_id: listing.id,
            url: urlData.publicUrl,
            position: i,
          });
        }
      }

      // Insert compatibility
      for (const c of compatList) {
        await supabase.from('listing_compatibility').insert({
          listing_id: listing.id,
          brand_id: c.brandId,
          model_id: c.modelId || null,
        });
      }

      toast.success('Объявление создано!');
      navigate(`/listing/${listing.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка при создании');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl py-6">
        <h1 className="font-display text-2xl font-bold">Новое объявление</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Images */}
          <div>
            <Label>Фотографии</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-foreground/80 p-0.5">
                    <X className="h-3 w-3 text-background" />
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Фото</span>
                <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Название *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Тормозные колодки Honda CBR600" required />
            </div>

            <div>
              <Label>Тип</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="part">Запчасть</SelectItem>
                  <SelectItem value="motorcycle">Мотоцикл</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Состояние</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="used">Б/У</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Цена (₽) *</Label>
              <Input id="price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" required />
            </div>

            <div>
              <Label htmlFor="city">Город</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="desc">Описание</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Подробное описание..." rows={4} />
            </div>
          </div>

          {/* Compatibility */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display font-bold">Совместимость</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Укажите для каких мотоциклов подходит</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {compatList.map((c, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {c.brandName} {c.modelName}
                  <button type="button" onClick={() => setCompatList(compatList.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Select value={selectedBrandId} onValueChange={(v) => { setSelectedBrandId(v); setSelectedModelId(''); }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Марка" /></SelectTrigger>
                <SelectContent>
                  {brands?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedBrandId && models && models.length > 0 && (
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Модель" /></SelectTrigger>
                  <SelectContent>
                    {models.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button type="button" variant="outline" size="icon" onClick={addCompat} disabled={!selectedBrandId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Публикация...' : 'Опубликовать'}
          </Button>
        </form>
      </div>
    </div>
  );
}
