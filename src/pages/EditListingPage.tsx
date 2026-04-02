import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X, Upload, Trash2 } from 'lucide-react';

interface CompatEntry {
  brandId: string;
  modelId: string;
  generationId: string;
  brandName: string;
  modelName: string;
  generationName: string;
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'used'>('used');
  const [type, setType] = useState<'part' | 'motorcycle'>('part');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'active' | 'sold' | 'archived'>('active');
  const [existingImages, setExistingImages] = useState<{ id: string; url: string; position: number }[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [motoBrandId, setMotoBrandId] = useState('');
  const [motoModelId, setMotoModelId] = useState('');
  const [motoGenId, setMotoGenId] = useState('');
  const [compatEnabled, setCompatEnabled] = useState(false);
  const [compatList, setCompatList] = useState<CompatEntry[]>([]);
  const [selBrandId, setSelBrandId] = useState('');
  const [selModelId, setSelModelId] = useState('');
  const [selGenId, setSelGenId] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['edit-listing', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(*), listing_compatibility(*, brands(name), models(name), generations(name, year_from, year_to)), listing_categories(category_id)')
        .eq('id', id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').order('name');
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      return data || [];
    },
  });

  const { data: motoModels } = useQuery({
    queryKey: ['models', motoBrandId],
    queryFn: async () => {
      if (!motoBrandId) return [];
      const { data } = await supabase.from('models').select('*').eq('brand_id', motoBrandId).order('name');
      return data || [];
    },
    enabled: !!motoBrandId,
  });

  const { data: motoGenerations } = useQuery({
    queryKey: ['generations', motoModelId],
    queryFn: async () => {
      if (!motoModelId) return [];
      const { data } = await supabase.from('generations').select('*').eq('model_id', motoModelId).order('year_from');
      return data || [];
    },
    enabled: !!motoModelId,
  });

  const { data: compatModels } = useQuery({
    queryKey: ['models', selBrandId],
    queryFn: async () => {
      if (!selBrandId) return [];
      const { data } = await supabase.from('models').select('*').eq('brand_id', selBrandId).order('name');
      return data || [];
    },
    enabled: !!selBrandId,
  });

  const { data: compatGenerations } = useQuery({
    queryKey: ['generations', selModelId],
    queryFn: async () => {
      if (!selModelId) return [];
      const { data } = await supabase.from('generations').select('*').eq('model_id', selModelId).order('year_from');
      return data || [];
    },
    enabled: !!selModelId,
  });

  // Initialize form from listing data
  useEffect(() => {
    if (!listing || initialized) return;
    setTitle(listing.title);
    setDescription(listing.description || '');
    setPrice(String(listing.price));
    setCondition(listing.condition);
    setType(listing.type);
    setCity(listing.city || '');
    setStatus(listing.status);
    setExistingImages(
      (listing.listing_images || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((img: any) => ({ id: img.id, url: img.url, position: img.position }))
    );

    // Category
    const cat = listing.listing_categories?.[0];
    if (cat) setCategoryId(cat.category_id);

    // Compatibility
    const compats = listing.listing_compatibility || [];
    if (listing.type === 'motorcycle' && compats.length > 0) {
      const first = compats[0];
      setMotoBrandId(first.brand_id);
      if (first.model_id) setMotoModelId(first.model_id);
      if (first.generation_id) setMotoGenId(first.generation_id);
    } else if (listing.type === 'part' && compats.length > 0) {
      setCompatEnabled(true);
      setCompatList(compats.map((c: any) => ({
        brandId: c.brand_id,
        modelId: c.model_id || '',
        generationId: c.generation_id || '',
        brandName: c.brands?.name || '',
        modelName: c.models?.name || '',
        generationName: c.generations ? `${c.generations.name}${c.generations.year_from ? ` (${c.generations.year_from}–${c.generations.year_to || '...'})` : ''}` : '',
      })));
    }
    setInitialized(true);
  }, [listing, initialized]);

  if (!user) { navigate('/auth'); return null; }
  if (listingLoading) return <div className="min-h-screen bg-background"><Header /><div className="container py-16 text-center text-muted-foreground">Загрузка...</div></div>;
  if (listing && listing.user_id !== user.id) return <div className="min-h-screen bg-background"><Header /><div className="container py-16 text-center text-muted-foreground">Нет доступа</div></div>;

  const addCompat = () => {
    if (!selBrandId) return;
    const brand = brands?.find((b: any) => b.id === selBrandId);
    const model = compatModels?.find((m: any) => m.id === selModelId);
    const gen = compatGenerations?.find((g: any) => g.id === selGenId);
    if (brand) {
      setCompatList([...compatList, {
        brandId: brand.id, modelId: model?.id || '', generationId: gen?.id || '',
        brandName: brand.name, modelName: model?.name || '',
        generationName: gen ? `${gen.name}${gen.year_from ? ` (${gen.year_from}–${gen.year_to || '...'})` : ''}` : '',
      }]);
      setSelBrandId(''); setSelModelId(''); setSelGenId('');
    }
  };

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages([...newImages, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () => setNewPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeExistingImage = async (imgId: string) => {
    await supabase.from('listing_images').delete().eq('id', imgId);
    setExistingImages(existingImages.filter((img) => img.id !== imgId));
  };

  const removeNewImage = (idx: number) => {
    setNewImages(newImages.filter((_, i) => i !== idx));
    setNewPreviews(newPreviews.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) { toast.error('Заполните обязательные поля'); return; }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('listings')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: parseFloat(price),
          condition,
          type,
          city: city.trim() || null,
          status,
        })
        .eq('id', id!);
      if (error) throw error;

      // Upload new images
      const startPos = existingImages.length;
      for (let i = 0; i < newImages.length; i++) {
        const file = newImages[i];
        const path = `${user.id}/${id}/${Date.now()}-${i}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('listings').upload(path, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('listings').getPublicUrl(path);
          await supabase.from('listing_images').insert({
            listing_id: id!,
            url: urlData.publicUrl,
            position: startPos + i,
          });
        }
      }

      // Update compatibility
      await supabase.from('listing_compatibility').delete().eq('listing_id', id!);
      if (type === 'motorcycle' && motoBrandId) {
        await supabase.from('listing_compatibility').insert({
          listing_id: id!,
          brand_id: motoBrandId,
          model_id: motoModelId || null,
          generation_id: motoGenId || null,
        });
      }
      if (type === 'part' && compatEnabled) {
        for (const c of compatList) {
          await supabase.from('listing_compatibility').insert({
            listing_id: id!,
            brand_id: c.brandId,
            model_id: c.modelId || null,
            generation_id: c.generationId || null,
          });
        }
      }

      // Update category
      await supabase.from('listing_categories').delete().eq('listing_id', id!);
      if (type === 'part' && categoryId) {
        await supabase.from('listing_categories').insert({ listing_id: id!, category_id: categoryId });
      }

      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['edit-listing', id] });
      toast.success('Объявление обновлено!');
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl py-6">
        <h1 className="font-display text-2xl font-bold">Редактировать объявление</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Images */}
          <div>
            <Label>Фотографии</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {existingImages.map((img) => (
                <div key={img.id} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(img.id)} className="absolute right-1 top-1 rounded-full bg-destructive p-0.5">
                    <Trash2 className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeNewImage(i)} className="absolute right-1 top-1 rounded-full bg-foreground/80 p-0.5">
                    <X className="h-3 w-3 text-background" />
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Фото</span>
                <input type="file" accept="image/*" multiple onChange={handleNewImages} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Название *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
              <Label>Статус</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активное</SelectItem>
                  <SelectItem value="sold">Продано</SelectItem>
                  <SelectItem value="archived">В архив</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">Цена (₽) *</Label>
              <Input id="price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="city">Город</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="desc">Описание</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
          </div>

          {/* Motorcycle: Brand / Model / Year */}
          {type === 'motorcycle' && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h2 className="font-display font-bold">Марка и модель</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Марка</Label>
                  <Select value={motoBrandId} onValueChange={(v) => { setMotoBrandId(v); setMotoModelId(''); setMotoGenId(''); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>{brands?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {motoBrandId && motoModels && motoModels.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Модель</Label>
                    <Select value={motoModelId} onValueChange={(v) => { setMotoModelId(v); setMotoGenId(''); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите" /></SelectTrigger>
                      <SelectContent>{motoModels.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {motoModelId && motoGenerations && motoGenerations.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Год выпуска</Label>
                    <Select value={motoGenId} onValueChange={setMotoGenId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите" /></SelectTrigger>
                      <SelectContent>{motoGenerations.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}{g.year_from ? ` (${g.year_from}–${g.year_to || '...'})` : ''}</SelectItem>
                      ))}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parts: Category */}
          {type === 'part' && (
            <div>
              <Label>Категория запчасти</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {/* Parts: Compatibility */}
          {type === 'part' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold">Подходит к моделям</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Укажите мотоциклы, к которым подходит запчасть</p>
                </div>
                <Switch checked={compatEnabled} onCheckedChange={setCompatEnabled} />
              </div>
              {compatEnabled && (
                <div className="mt-4 space-y-3">
                  {compatList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {compatList.map((c, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {c.brandName} {c.modelName} {c.generationName}
                          <button type="button" onClick={() => setCompatList(compatList.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Select value={selBrandId} onValueChange={(v) => { setSelBrandId(v); setSelModelId(''); setSelGenId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Марка" /></SelectTrigger>
                      <SelectContent>{brands?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {selBrandId && compatModels && compatModels.length > 0 && (
                      <Select value={selModelId} onValueChange={(v) => { setSelModelId(v); setSelGenId(''); }}>
                        <SelectTrigger><SelectValue placeholder="Модель" /></SelectTrigger>
                        <SelectContent>{compatModels.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {selModelId && compatGenerations && compatGenerations.length > 0 && (
                      <Select value={selGenId} onValueChange={setSelGenId}>
                        <SelectTrigger><SelectValue placeholder="Год" /></SelectTrigger>
                        <SelectContent>{compatGenerations.map((g: any) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}{g.year_from ? ` (${g.year_from}–${g.year_to || '...'})` : ''}</SelectItem>
                        ))}</SelectContent>
                      </Select>
                    )}
                    <Button type="button" variant="outline" size="icon" onClick={addCompat} disabled={!selBrandId} className="h-10 w-10">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" size="lg" className="flex-1" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate('/profile')}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
