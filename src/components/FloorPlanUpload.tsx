import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface FloorPlan {
  id: string;
  name: string;
  original_image_url: string;
  floor_area_sqm: number | null;
  usable_area_sqm: number | null;
}

interface Props {
  projectId: string;
  onFloorPlanUploaded: (floorPlan: FloorPlan) => void;
  floorPlans: FloorPlan[];
  onSelectFloorPlan: (floorPlan: FloorPlan) => void;
  selectedFloorPlan: FloorPlan | null;
}

export function FloorPlanUpload({
  projectId,
  onFloorPlanUploaded,
  floorPlans,
  onSelectFloorPlan,
  selectedFloorPlan
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [floorPlanName, setFloorPlanName] = useState('');
  const [floorArea, setFloorArea] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !floorPlanName.trim()) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(fileName);

      const { data: floorPlan, error: insertError } = await supabase
        .from('floor_plans')
        .insert({
          project_id: projectId,
          name: floorPlanName,
          original_image_url: urlData.publicUrl,
          floor_area_sqm: floorArea ? parseFloat(floorArea) : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onFloorPlanUploaded(floorPlan);
      setSelectedFile(null);
      setPreviewUrl(null);
      setFloorPlanName('');
      setFloorArea('');
    } catch (error) {
      console.error('Error uploading floor plan:', error);
      alert('上傳失敗，請稍後再試');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginTop: 0 }}>上傳平面圖</h2>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragActive ? '2px dashed #667eea' : '2px dashed #ddd',
            borderRadius: '8px',
            padding: '3rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragActive ? '#f0f4ff' : '#fafafa',
            marginBottom: '1.5rem'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            style={{ display: 'none' }}
          />

          {previewUrl ? (
            <div>
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '4px',
                  marginBottom: '1rem'
                }}
              />
              <p style={{ color: '#666' }}>點擊重新選擇檔案</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                拖曳平面圖到這裡，或點擊選擇檔案
              </p>
              <p style={{ color: '#999', fontSize: '0.9rem' }}>
                支援 JPG、PNG、PDF 格式
              </p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                平面圖名稱
              </label>
              <input
                type="text"
                value={floorPlanName}
                onChange={(e) => setFloorPlanName(e.target.value)}
                placeholder="例：一樓平面圖"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                總面積 (選填，平方公尺)
              </label>
              <input
                type="number"
                value={floorArea}
                onChange={(e) => setFloorArea(e.target.value)}
                placeholder="例：150"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !floorPlanName.trim()}
              style={{
                width: '100%',
                padding: '1rem',
                background: (uploading || !floorPlanName.trim()) ? '#ccc' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (uploading || !floorPlanName.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              {uploading ? '上傳中...' : '上傳平面圖'}
            </button>
          </div>
        )}
      </div>

      {floorPlans.length > 0 && (
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px'
        }}>
          <h3 style={{ marginTop: 0 }}>已上傳的平面圖</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            {floorPlans.map((floorPlan) => (
              <div
                key={floorPlan.id}
                onClick={() => onSelectFloorPlan(floorPlan)}
                style={{
                  border: selectedFloorPlan?.id === floorPlan.id ? '3px solid #667eea' : '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <img
                  src={floorPlan.original_image_url}
                  alt={floorPlan.name}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}
                />
                <h4 style={{ margin: '0.5rem 0' }}>{floorPlan.name}</h4>
                {floorPlan.floor_area_sqm && (
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {floorPlan.floor_area_sqm} m²
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
