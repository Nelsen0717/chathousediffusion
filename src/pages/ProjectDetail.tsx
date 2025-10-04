import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FloorPlanUpload } from '../components/FloorPlanUpload';
import { SpaceRequirements } from '../components/SpaceRequirements';
import { LayoutSolutions } from '../components/LayoutSolutions';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface FloorPlan {
  id: string;
  name: string;
  original_image_url: string;
  floor_area_sqm: number | null;
  usable_area_sqm: number | null;
}

export function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'requirements' | 'solutions'>('upload');

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadFloorPlans();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFloorPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFloorPlans(data || []);
      if (data && data.length > 0 && !selectedFloorPlan) {
        setSelectedFloorPlan(data[0]);
      }
    } catch (error) {
      console.error('Error loading floor plans:', error);
    }
  };

  const handleFloorPlanUploaded = (floorPlan: FloorPlan) => {
    setFloorPlans([floorPlan, ...floorPlans]);
    setSelectedFloorPlan(floorPlan);
    setActiveTab('requirements');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>載入中...</div>;
  }

  if (!project) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>找不到專案</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <nav style={{
        background: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '0.5rem 1rem',
              background: '#f1f3f4',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← 返回
          </button>
          <h1 style={{ margin: 0, color: '#333' }}>{project.name}</h1>
        </div>
      </nav>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {project.description && (
          <p style={{
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            {project.description}
          </p>
        )}

        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e0e0e0'
        }}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'upload' ? '#667eea' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'upload' ? 'bold' : 'normal',
              fontSize: '1rem'
            }}
          >
            上傳平面圖
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            disabled={!selectedFloorPlan}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'requirements' ? '3px solid #667eea' : '3px solid transparent',
              color: !selectedFloorPlan ? '#ccc' : (activeTab === 'requirements' ? '#667eea' : '#666'),
              cursor: selectedFloorPlan ? 'pointer' : 'not-allowed',
              fontWeight: activeTab === 'requirements' ? 'bold' : 'normal',
              fontSize: '1rem'
            }}
          >
            空間需求
          </button>
          <button
            onClick={() => setActiveTab('solutions')}
            disabled={!selectedFloorPlan}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'solutions' ? '3px solid #667eea' : '3px solid transparent',
              color: !selectedFloorPlan ? '#ccc' : (activeTab === 'solutions' ? '#667eea' : '#666'),
              cursor: selectedFloorPlan ? 'pointer' : 'not-allowed',
              fontWeight: activeTab === 'solutions' ? 'bold' : 'normal',
              fontSize: '1rem'
            }}
          >
            配置方案
          </button>
        </div>

        {activeTab === 'upload' && (
          <FloorPlanUpload
            projectId={projectId!}
            onFloorPlanUploaded={handleFloorPlanUploaded}
            floorPlans={floorPlans}
            onSelectFloorPlan={setSelectedFloorPlan}
            selectedFloorPlan={selectedFloorPlan}
          />
        )}

        {activeTab === 'requirements' && selectedFloorPlan && (
          <SpaceRequirements
            projectId={projectId!}
            floorPlan={selectedFloorPlan}
            onComplete={() => setActiveTab('solutions')}
          />
        )}

        {activeTab === 'solutions' && selectedFloorPlan && (
          <LayoutSolutions
            floorPlan={selectedFloorPlan}
          />
        )}
      </div>
    </div>
  );
}
