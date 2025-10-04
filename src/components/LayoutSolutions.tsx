import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FloorPlan {
  id: string;
  name: string;
  original_image_url: string;
  floor_area_sqm: number | null;
}

interface Props {
  floorPlan: FloorPlan;
}

interface Solution {
  id: string;
  feasibility_score: number;
  is_feasible: boolean;
  workstations_placed: number;
  meeting_rooms_placed: any;
  amenities_placed: any;
  utilization_rate: number;
  constraints_met: any;
  suggestions: string;
  created_at: string;
}

interface SpaceRequirement {
  id: string;
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

export function LayoutSolutions({ floorPlan }: Props) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [requirements, setRequirements] = useState<SpaceRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadRequirementsAndSolutions();
  }, [floorPlan.id]);

  const loadRequirementsAndSolutions = async () => {
    try {
      const { data: reqData, error: reqError } = await supabase
        .from('space_requirements')
        .select('*')
        .eq('floor_plan_id', floorPlan.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reqError) throw reqError;
      setRequirements(reqData);

      if (reqData) {
        const { data: solData, error: solError } = await supabase
          .from('layout_solutions')
          .select('*')
          .eq('space_requirement_id', reqData.id)
          .order('created_at', { ascending: false });

        if (solError) throw solError;
        setSolutions(solData || []);
      }
    } catch (error) {
      console.error('Error loading solutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSolution = async () => {
    if (!requirements) return;

    setGenerating(true);
    try {
      const estimatedWorkstations = Math.floor(requirements.workstations * 0.85);
      const estimatedSmallRooms = Math.min(requirements.meeting_rooms_small,
        Math.floor((floorPlan.floor_area_sqm || 0) / 100));
      const estimatedMediumRooms = Math.min(requirements.meeting_rooms_medium,
        Math.floor((floorPlan.floor_area_sqm || 0) / 150));

      const feasibilityScore = calculateFeasibilityScore(requirements, floorPlan.floor_area_sqm);
      const isFeasible = feasibilityScore >= 60;

      const { data, error } = await supabase
        .from('layout_solutions')
        .insert({
          floor_plan_id: floorPlan.id,
          space_requirement_id: requirements.id,
          feasibility_score: feasibilityScore,
          is_feasible: isFeasible,
          workstations_placed: estimatedWorkstations,
          meeting_rooms_placed: {
            small: estimatedSmallRooms,
            medium: estimatedMediumRooms,
            large: Math.min(requirements.meeting_rooms_large, 1)
          },
          amenities_placed: {
            phone_booths: requirements.phone_booths,
            breakout_areas: requirements.breakout_areas,
            kitchen: requirements.kitchen_pantry,
            reception: requirements.reception_area,
            storage: requirements.storage_rooms,
            server_room: requirements.server_room
          },
          utilization_rate: Math.min(95, (estimatedWorkstations * 6) / (floorPlan.floor_area_sqm || 1) * 100),
          constraints_met: {
            workstations: estimatedWorkstations >= requirements.workstations * 0.8,
            meeting_rooms: estimatedSmallRooms + estimatedMediumRooms >=
              (requirements.meeting_rooms_small + requirements.meeting_rooms_medium) * 0.7,
            amenities: true
          },
          suggestions: generateSuggestions(requirements, floorPlan.floor_area_sqm, isFeasible),
          generation_params: {
            algorithm: 'space_allocation_v1',
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;
      setSolutions([data, ...solutions]);
    } catch (error) {
      console.error('Error generating solution:', error);
      alert('生成方案失敗，請稍後再試');
    } finally {
      setGenerating(false);
    }
  };

  const calculateFeasibilityScore = (req: SpaceRequirement, availableArea: number | null): number => {
    if (!availableArea) return 50;

    const requiredArea =
      req.workstations * 6 +
      req.meeting_rooms_small * 15 +
      req.meeting_rooms_medium * 25 +
      req.meeting_rooms_large * 40 +
      req.phone_booths * 2 +
      req.breakout_areas * 20 +
      (req.kitchen_pantry ? 15 : 0) +
      (req.reception_area ? 20 : 0) +
      req.storage_rooms * 10 +
      (req.server_room ? 15 : 0);

    const withCirculation = requiredArea * 1.4;
    const ratio = availableArea / withCirculation;

    if (ratio >= 1.2) return 95;
    if (ratio >= 1.0) return 85;
    if (ratio >= 0.9) return 70;
    if (ratio >= 0.8) return 55;
    return 40;
  };

  const generateSuggestions = (req: SpaceRequirement, availableArea: number | null, isFeasible: boolean): string => {
    if (!availableArea) return '建議先設定平面圖的總面積以獲得更準確的分析。';

    const suggestions = [];

    if (!isFeasible) {
      suggestions.push('空間不足以容納所有需求，建議：');
      suggestions.push('- 減少工作站數量或採用更緊湊的配置');
      suggestions.push('- 考慮使用靈活的共享空間取代部分固定會議室');
      suggestions.push('- 評估是否真的需要所有設施');
    } else {
      suggestions.push('空間配置可行！建議：');
      suggestions.push('- 採用開放式工作區域提高空間使用效率');
      suggestions.push('- 使用玻璃隔間增加採光和空間感');
      suggestions.push('- 預留 10-15% 空間作為未來擴充使用');
    }

    if (req.workstations > 30) {
      suggestions.push('- 考慮設置協作區域促進團隊互動');
    }

    if (req.meeting_rooms_small + req.meeting_rooms_medium + req.meeting_rooms_large > 5) {
      suggestions.push('- 會議室數量較多，建議採用預約系統提高使用率');
    }

    return suggestions.join('\n');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>載入中...</div>;
  }

  if (!requirements) {
    return (
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3>尚未設定空間需求</h3>
        <p style={{ color: '#666' }}>請先在「空間需求」分頁設定您的需求</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>配置方案</h2>
          <button
            onClick={generateSolution}
            disabled={generating}
            style={{
              padding: '0.75rem 1.5rem',
              background: generating ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: generating ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {generating ? '生成中...' : '生成新方案'}
          </button>
        </div>

        <div style={{
          background: '#f0f4ff',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>您的需求摘要</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>工作站：</strong> {requirements.workstations} 個
            </div>
            <div>
              <strong>會議室：</strong> {requirements.meeting_rooms_small + requirements.meeting_rooms_medium + requirements.meeting_rooms_large} 間
            </div>
            <div>
              <strong>電話亭：</strong> {requirements.phone_booths} 間
            </div>
            <div>
              <strong>休息區：</strong> {requirements.breakout_areas} 個
            </div>
          </div>
        </div>
      </div>

      {solutions.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>🏗️</p>
          <h3>尚未生成配置方案</h3>
          <p style={{ color: '#666' }}>點擊上方「生成新方案」按鈕開始分析</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {solutions.map((solution, index) => (
            <div
              key={solution.id}
              style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '8px',
                border: `2px solid ${solution.is_feasible ? '#1e7e34' : '#f59e0b'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>方案 {solutions.length - index}</h3>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: solution.is_feasible ? '#e6f4ea' : '#fef3c7',
                  color: solution.is_feasible ? '#1e7e34' : '#92400e',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>
                  可行性評分：{solution.feasibility_score}/100
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 1rem 0' }}>配置結果</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>✓ 工作站：{solution.workstations_placed} 個</div>
                    <div>✓ 小型會議室：{solution.meeting_rooms_placed.small} 間</div>
                    <div>✓ 中型會議室：{solution.meeting_rooms_placed.medium} 間</div>
                    <div>✓ 大型會議室：{solution.meeting_rooms_placed.large} 間</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 1rem 0' }}>設施配置</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>{solution.amenities_placed.phone_booths > 0 ? '✓' : '○'} 電話亭：{solution.amenities_placed.phone_booths} 間</div>
                    <div>{solution.amenities_placed.breakout_areas > 0 ? '✓' : '○'} 休息區：{solution.amenities_placed.breakout_areas} 個</div>
                    <div>{solution.amenities_placed.kitchen ? '✓' : '○'} 茶水間</div>
                    <div>{solution.amenities_placed.reception ? '✓' : '○'} 接待區</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 1rem 0' }}>空間指標</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <strong>利用率：</strong>
                      <div style={{
                        marginTop: '0.5rem',
                        background: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${solution.utilization_rate}%`,
                          background: '#667eea',
                          padding: '0.25rem 0.5rem',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}>
                          {Math.round(solution.utilization_rate)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: '4px solid #667eea'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>AI 建議</h4>
                <pre style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  color: '#666'
                }}>
                  {solution.suggestions}
                </pre>
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#999', textAlign: 'right' }}>
                生成時間：{new Date(solution.created_at).toLocaleString('zh-TW')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
