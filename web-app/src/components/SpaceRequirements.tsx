import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FloorPlan {
  id: string;
  name: string;
  floor_area_sqm: number | null;
}

interface Props {
  projectId: string;
  floorPlan: FloorPlan;
  onComplete: () => void;
}

interface Requirements {
  workstations: number;
  meeting_rooms_small: number;
  meeting_rooms_medium: number;
  meeting_rooms_large: number;
  phone_booths: number;
  breakout_areas: number;
  kitchen_pantry: boolean;
  reception_area: boolean;
  storage_rooms: number;
  server_room: boolean;
  additional_notes: string;
}

export function SpaceRequirements({ projectId, floorPlan, onComplete }: Props) {
  const [requirements, setRequirements] = useState<Requirements>({
    workstations: 10,
    meeting_rooms_small: 1,
    meeting_rooms_medium: 1,
    meeting_rooms_large: 0,
    phone_booths: 2,
    breakout_areas: 1,
    kitchen_pantry: true,
    reception_area: true,
    storage_rooms: 1,
    server_room: false,
    additional_notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [estimatedArea, setEstimatedArea] = useState(0);

  useEffect(() => {
    loadExistingRequirements();
  }, [floorPlan.id]);

  useEffect(() => {
    calculateEstimatedArea();
  }, [requirements]);

  const loadExistingRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from('space_requirements')
        .select('*')
        .eq('floor_plan_id', floorPlan.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setRequirements({
          workstations: data.workstations,
          meeting_rooms_small: data.meeting_rooms_small,
          meeting_rooms_medium: data.meeting_rooms_medium,
          meeting_rooms_large: data.meeting_rooms_large,
          phone_booths: data.phone_booths,
          breakout_areas: data.breakout_areas,
          kitchen_pantry: data.kitchen_pantry,
          reception_area: data.reception_area,
          storage_rooms: data.storage_rooms,
          server_room: data.server_room,
          additional_notes: data.additional_notes
        });
      }
    } catch (error) {
      console.error('Error loading requirements:', error);
    }
  };

  const calculateEstimatedArea = () => {
    const workstationArea = requirements.workstations * 6;
    const smallMeetingArea = requirements.meeting_rooms_small * 15;
    const mediumMeetingArea = requirements.meeting_rooms_medium * 25;
    const largeMeetingArea = requirements.meeting_rooms_large * 40;
    const phoneBoothArea = requirements.phone_booths * 2;
    const breakoutArea = requirements.breakout_areas * 20;
    const kitchenArea = requirements.kitchen_pantry ? 15 : 0;
    const receptionArea = requirements.reception_area ? 20 : 0;
    const storageArea = requirements.storage_rooms * 10;
    const serverArea = requirements.server_room ? 15 : 0;

    const total = workstationArea + smallMeetingArea + mediumMeetingArea +
                  largeMeetingArea + phoneBoothArea + breakoutArea +
                  kitchenArea + receptionArea + storageArea + serverArea;

    const withCirculation = total * 1.4;

    setEstimatedArea(Math.round(withCirculation));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('space_requirements')
        .insert({
          project_id: projectId,
          floor_plan_id: floorPlan.id,
          ...requirements
        })
        .select()
        .single();

      if (error) throw error;

      alert('需求已儲存！');
      onComplete();
    } catch (error) {
      console.error('Error saving requirements:', error);
      alert('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const isAreaSufficient = !floorPlan.floor_area_sqm || estimatedArea <= floorPlan.floor_area_sqm;

  return (
    <div style={{
      background: 'white',
      padding: '2rem',
      borderRadius: '8px'
    }}>
      <h2 style={{ marginTop: 0 }}>空間需求設定</h2>

      <div style={{
        background: isAreaSufficient ? '#e6f4ea' : '#fce8e6',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: `2px solid ${isAreaSufficient ? '#1e7e34' : '#c5221f'}`
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: isAreaSufficient ? '#1e7e34' : '#c5221f' }}>
          預估所需面積：{estimatedArea} m²
        </h3>
        {floorPlan.floor_area_sqm && (
          <p style={{ margin: 0, color: '#666' }}>
            可用面積：{floorPlan.floor_area_sqm} m²
            {isAreaSufficient ? ' ✓ 空間充足' : ' ⚠️ 空間不足'}
          </p>
        )}
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
          * 預估包含走道、公共空間等循環面積（40% 加成）
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h3>工作區域</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              工作站數量
            </label>
            <input
              type="number"
              value={requirements.workstations}
              onChange={(e) => setRequirements({...requirements, workstations: parseInt(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              min="0"
            />
            <small style={{ color: '#666' }}>每個工位約 6 m²</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              電話亭
            </label>
            <input
              type="number"
              value={requirements.phone_booths}
              onChange={(e) => setRequirements({...requirements, phone_booths: parseInt(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              min="0"
            />
            <small style={{ color: '#666' }}>每間約 2 m²</small>
          </div>
        </div>

        <div>
          <h3>會議室</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              小型會議室 (4-6人)
            </label>
            <input
              type="number"
              value={requirements.meeting_rooms_small}
              onChange={(e) => setRequirements({...requirements, meeting_rooms_small: parseInt(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              min="0"
            />
            <small style={{ color: '#666' }}>每間約 15 m²</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              中型會議室 (8-10人)
            </label>
            <input
              type="number"
              value={requirements.meeting_rooms_medium}
              onChange={(e) => setRequirements({...requirements, meeting_rooms_medium: parseInt(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              min="0"
            />
            <small style={{ color: '#666' }}>每間約 25 m²</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              大型會議室 (12+人)
            </label>
            <input
              type="number"
              value={requirements.meeting_rooms_large}
              onChange={(e) => setRequirements({...requirements, meeting_rooms_large: parseInt(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              min="0"
            />
            <small style={{ color: '#666' }}>每間約 40 m²</small>
          </div>
        </div>

        <div>
          <h3>公共設施</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              休息區
            </label>
            <input
              type="number"
              value={requirements.breakout_areas}
              onChange={(e) => setRequirements({...requirements, breakout_areas: parseInt(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              min="0"
            />
            <small style={{ color: '#666' }}>每個約 20 m²</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              儲藏室
            </label>
            <input
              type="number"
              value={requirements.storage_rooms}
              onChange={(e) => setRequirements({...requirements, storage_rooms: parseInt(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              min="0"
            />
            <small style={{ color: '#666' }}>每間約 10 m²</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={requirements.kitchen_pantry}
                onChange={(e) => setRequirements({...requirements, kitchen_pantry: e.target.checked})}
                style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
              />
              茶水間 (約 15 m²)
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={requirements.reception_area}
                onChange={(e) => setRequirements({...requirements, reception_area: e.target.checked})}
                style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
              />
              接待區 (約 20 m²)
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={requirements.server_room}
                onChange={(e) => setRequirements({...requirements, server_room: e.target.checked})}
                style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
              />
              機房 (約 15 m²)
            </label>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          其他需求或備註
        </label>
        <textarea
          value={requirements.additional_notes}
          onChange={(e) => setRequirements({...requirements, additional_notes: e.target.value})}
          placeholder="例：需要開放式工作區、希望有獨立主管室等..."
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem',
            minHeight: '100px'
          }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '1rem',
          background: saving ? '#ccc' : '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}
      >
        {saving ? '儲存中...' : '儲存需求並生成配置方案'}
      </button>
    </div>
  );
}
