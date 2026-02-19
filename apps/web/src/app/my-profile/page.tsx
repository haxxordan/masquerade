"use client";

import { useEffect, useState } from 'react';
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, useSortable,
    verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { profilesApi } from '@dating/api-client';
import type { Profile, ProfileLayout, ProfileWidget } from '@dating/types';
import Image from 'next/image';

const THEMES = ['dark', 'retro', 'ocean', 'forest'] as const;
const themeClasses: Record<string, string> = {
    dark: 'bg-black text-white',
    retro: 'bg-[#000033] text-[#ff99ff]',
    ocean: 'bg-[#001133] text-[#99ccff]',
    forest: 'bg-[#0a1a0a] text-[#99ff99]',
};

function SortableWidget({ widget, onEdit }: {
    widget: ProfileWidget;
    onEdit: (id: string, field: 'title' | 'content', value: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="border border-white/20 rounded-lg p-3 mb-2 bg-white/5">
            <div className="flex items-center gap-2 mb-2">
                <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-white text-lg">⠿</button>
                <input
                    className="bg-transparent font-bold flex-1 outline-none border-b border-white/20"
                    value={widget.title}
                    onChange={e => onEdit(widget.id, 'title', e.target.value)}
                />
                <span className="text-xs opacity-40">{widget.type}</span>
            </div>
            <textarea
                className="w-full bg-transparent text-sm outline-none resize-none border border-white/10 rounded p-2"
                rows={3}
                value={widget.content}
                onChange={e => onEdit(widget.id, 'content', e.target.value)}
                placeholder="Nothing here yet..."
            />
        </div>
    );
}

export default function MyProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [layout, setLayout] = useState<ProfileLayout | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        profilesApi.getMe().then(p => {
            setProfile(p);
            setLayout(p.layout);
        }).catch(err => {
            console.error('getMe failed:', err);
        });
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !layout) return;
        const oldIndex = layout.widgets.findIndex(w => w.id === active.id);
        const newIndex = layout.widgets.findIndex(w => w.id === over.id);
        const reordered = arrayMove(layout.widgets, oldIndex, newIndex)
            .map((w, i) => ({ ...w, order: i }));
        setLayout({ ...layout, widgets: reordered });
    };

    const handleEditWidget = (id: string, field: 'title' | 'content', value: string) => {
        if (!layout) return;
        setLayout({
            ...layout,
            widgets: layout.widgets.map(w => w.id === id ? { ...w, [field]: value } : w),
        });
    };

    const handleSave = async () => {
        if (!profile || !layout) return;
        setSaving(true);
        await profilesApi.update(profile.id, { layout });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!profile || !layout) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className={`min-h-screen ${themeClasses[layout.theme] ?? themeClasses.dark} p-6`}>
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">My Profile</h1>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-full font-bold bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-50 transition"
                    >
                        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
                    </button>
                </div>

                {/* Avatar & name */}
                <div className="flex items-center gap-4 mb-8">
                    {profile.animalAvatarUrl
                        ? <Image src={profile.animalAvatarUrl} alt={profile.animalType} width={80} height={80} className="rounded-full" />
                        : <span className="text-5xl">🐾</span>}
                    <div>
                        <div className="text-xl font-bold">{profile.displayName}</div>
                        <div className="text-sm opacity-60">{profile.animalType}</div>
                    </div>
                </div>

                {/* Theme picker */}
                <div className="mb-6">
                    <div className="text-sm font-bold mb-2 opacity-70 uppercase tracking-wide">Theme</div>
                    <div className="flex gap-2 flex-wrap">
                        {THEMES.map(t => (
                            <button
                                key={t}
                                onClick={() => setLayout({ ...layout, theme: t })}
                                className={`px-4 py-1 rounded-full text-sm border transition ${layout.theme === t ? 'border-pink-500 text-pink-400' : 'border-white/20 opacity-50 hover:opacity-100'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Accent color */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="text-sm font-bold opacity-70 uppercase tracking-wide">Accent Color</div>
                    <input
                        type="color"
                        value={layout.accentColor}
                        onChange={e => setLayout({ ...layout, accentColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-sm opacity-50">{layout.accentColor}</span>
                </div>

                {/* Widgets */}
                <div className="text-sm font-bold mb-3 opacity-70 uppercase tracking-wide">Widgets</div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={layout.widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
                        {[...layout.widgets]
                            .sort((a, b) => a.order - b.order)
                            .map(widget => (
                                <SortableWidget key={widget.id} widget={widget} onEdit={handleEditWidget} />
                            ))}
                    </SortableContext>
                </DndContext>

            </div>
        </div>
    );
}
