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

// ─── Constants ───────────────────────────────────────────────────────────────
import { MUSIC_GENRES, HOBBY_OPTIONS } from '@dating/types';
import { WidgetPanel, TOP8_PLACEHOLDERS } from '@/components/profile';


const THEMES = ['riot', 'jupiter', 'ocean', 'sparrow'] as const;


const themeClasses: Record<string, string> = {
    riot: 'bg-black text-white',
    jupiter: 'bg-[#000033] text-[#ff99ff]',
    ocean: 'bg-[#001133] text-[#99ccff]',
    sparrow: 'bg-[#0a1a0a] text-[#99ff99]',
};

const DEFAULT_WIDGETS: ProfileWidget[] = [
    { id: 'w-about', type: 'about', title: 'About Me', content: '', order: 0 },
    { id: 'w-music', type: 'music', title: 'Music', content: '', order: 1 },
    { id: 'w-hobbies', type: 'hobbies', title: 'Hobbies & Interests', content: '', order: 2 },
    { id: 'w-top8', type: 'top8', title: 'Top 8', content: '', order: 3 },
    { id: 'w-blog', type: 'blog', title: 'Blog', content: '', order: 4 },
];


// ─── View-mode widget renderers ───────────────────────────────────────────────

function AboutWidget({ widget, accentColor }: { widget: ProfileWidget; accentColor: string }) {
    return (
        <WidgetPanel title={widget.title || 'About Me'} accentColor={accentColor}>
            <p className="whitespace-pre-wrap leading-relaxed">
                {widget.content || <span className="opacity-40 italic">Nothing here yet...</span>}
            </p>
        </WidgetPanel>
    );
}

function MusicWidget({
    widget,
    genres,
    accentColor,
}: {
    widget: ProfileWidget;
    genres: string[];
    accentColor: string;
}) {
    return (
        <WidgetPanel title={widget.title || 'Music'} accentColor={accentColor}>
            {genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {genres.map(g => (
                        <span
                            key={g}
                            className="px-2 py-0.5 rounded-full text-xs border"
                            style={{ borderColor: accentColor, color: accentColor }}
                        >
                            🎵 {g}
                        </span>
                    ))}
                </div>
            )}
            {widget.content && (
                <p className="whitespace-pre-wrap leading-relaxed opacity-80">{widget.content}</p>
            )}
        </WidgetPanel>
    );
}

function HobbiesWidget({
    widget,
    hobbies,
    accentColor,
}: {
    widget: ProfileWidget;
    hobbies: string[];
    accentColor: string;
}) {
    return (
        <WidgetPanel title={widget.title || 'Hobbies & Interests'} accentColor={accentColor}>
            {hobbies.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {hobbies.map(h => (
                        <span
                            key={h}
                            className="px-2 py-0.5 rounded-full text-xs border"
                            style={{ borderColor: accentColor, color: accentColor }}
                        >
                            {h}
                        </span>
                    ))}
                </div>
            )}
            {widget.content && (
                <p className="whitespace-pre-wrap leading-relaxed opacity-80">{widget.content}</p>
            )}
        </WidgetPanel>
    );
}

function Top8Widget({ widget, accentColor }: { widget: ProfileWidget; accentColor: string }) {
    return (
        <WidgetPanel title={widget.title || 'Top 8'} accentColor={accentColor}>
            <div className="grid grid-cols-4 gap-2">
                {TOP8_PLACEHOLDERS.map((p) => (
                    <div key={p.name} className="flex flex-col items-center text-center gap-1">
                        <div
                            className="w-12 h-12 rounded flex items-center justify-center text-2xl border"
                            style={{ borderColor: accentColor }}
                        >
                            {p.emoji}
                        </div>
                        <span className="text-xs font-semibold">{p.name}</span>
                        <span className="text-[10px] opacity-50">{p.animal}</span>
                    </div>
                ))}
            </div>
        </WidgetPanel>
    );
}

function BlogWidget({ widget, accentColor }: { widget: ProfileWidget; accentColor: string }) {
    return (
        <WidgetPanel title={widget.title || 'Blog'} accentColor={accentColor}>
            <p className="whitespace-pre-wrap leading-relaxed">
                {widget.content || <span className="opacity-40 italic">No entries yet...</span>}
            </p>
        </WidgetPanel>
    );
}

function ViewWidget({
    widget,
    profile,
    accentColor,
}: {
    widget: ProfileWidget;
    profile: Profile;
    accentColor: string;
}) {
    switch (widget.type) {
        case 'about': return <AboutWidget widget={widget} accentColor={accentColor} />;
        case 'music': return <MusicWidget widget={widget} genres={profile.musicGenres} accentColor={accentColor} />;
        case 'hobbies': return <HobbiesWidget widget={widget} hobbies={profile.hobbies} accentColor={accentColor} />;
        case 'top8': return <Top8Widget widget={widget} accentColor={accentColor} />;
        case 'blog': return <BlogWidget widget={widget} accentColor={accentColor} />;
        default: return null;
    }
}

// ─── Edit-mode sortable widget ────────────────────────────────────────────────

const WIDGET_OPTIONS: { type: ProfileWidget['type']; label: string; emoji: string }[] = [
    { type: 'about', label: 'About Me', emoji: '📝' },
    { type: 'music', label: 'Music', emoji: '🎵' },
    { type: 'hobbies', label: 'Hobbies', emoji: '🎨' },
    { type: 'top8', label: 'Top 8', emoji: '👥' },
    { type: 'blog', label: 'Blog', emoji: '📖' },
];

function AddWidgetBar({
    accentColor,
    onAdd,
}: {
    accentColor: string;
    onAdd: (type: ProfileWidget['type']) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="mt-2 mb-4">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm border transition opacity-70 hover:opacity-100"
                style={{ borderColor: accentColor, color: accentColor }}
            >
                <span className="text-lg leading-none">{open ? '✕' : '+'}</span>
                <span>{open ? 'Cancel' : 'Add Widget'}</span>
            </button>

            {open && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {WIDGET_OPTIONS.map(opt => (
                        <button
                            key={opt.type}
                            onClick={() => { onAdd(opt.type); setOpen(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm transition opacity-70 hover:opacity-100"
                            style={{ borderColor: accentColor, color: accentColor }}
                        >
                            <span>{opt.emoji}</span>
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function SortableWidget({
    widget,
    accentColor,
    profile,
    onEdit,
    onRemove,
    onProfileChange,
}: {
    widget: ProfileWidget;
    accentColor: string;
    profile: Profile;
    onEdit: (id: string, field: 'title' | 'content', value: string) => void;
    onRemove: (id: string) => void;
    onProfileChange: (fields: Partial<Profile>) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, borderColor: accentColor }}
            className="border rounded mb-3 overflow-hidden"
        >
            {/* Header */}
            <div
                className="flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-widest text-black"
                style={{ backgroundColor: accentColor }}
            >
                <span
                    className="opacity-60 cursor-grab active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    ⠿
                </span>
                <span className="flex-1">{widget.type}</span>
                <button
                    onClick={() => onRemove(widget.id)}
                    className="ml-auto text-black/60 hover:text-black transition text-base leading-none"
                    title="Remove widget"
                >
                    ✕
                </button>
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col gap-2">
                <input
                    className="bg-transparent border-b border-white/20 text-sm font-semibold outline-none w-full pb-1"
                    value={widget.title}
                    placeholder="Widget title..."
                    onChange={e => onEdit(widget.id, 'title', e.target.value)}
                />

                {widget.type === 'music' && (
                    <TagPicker
                        options={MUSIC_GENRES}
                        selected={profile.musicGenres}
                        accentColor={accentColor}
                        onChange={updated => onProfileChange({ musicGenres: updated })}
                    />
                )}

                {widget.type === 'hobbies' && (
                    <TagPicker
                        options={HOBBY_OPTIONS}
                        selected={profile.hobbies}
                        accentColor={accentColor}
                        onChange={updated => onProfileChange({ hobbies: updated })}
                    />
                )}

                {(widget.type === 'about' || widget.type === 'blog') && (
                    <textarea
                        className="bg-transparent text-sm outline-none w-full resize-none min-h-[80px] opacity-80"
                        value={widget.content}
                        placeholder="Nothing here yet..."
                        onChange={e => onEdit(widget.id, 'content', e.target.value)}
                    />
                )}

                {widget.type === 'top8' && (
                    <p className="text-xs opacity-40 italic">Top 8 uses placeholder data for now.</p>
                )}
            </div>
        </div>
    );
}

function TagPicker({
    options,
    selected,
    accentColor,
    onChange,
}: {
    options: readonly string[];
    selected: string[];
    accentColor: string;
    onChange: (updated: string[]) => void;
}) {
    const toggle = (item: string) =>
        onChange(
            selected.includes(item)
                ? selected.filter(i => i !== item)
                : [...selected, item]
        );

    return (
        <div className="flex flex-wrap gap-2 pt-1">
            {options.map(opt => {
                const active = selected.includes(opt);
                return (
                    <button
                        key={opt}
                        onClick={() => toggle(opt)}
                        className="px-3 py-1 rounded-full text-xs border transition"
                        style={
                            active
                                ? { backgroundColor: accentColor, borderColor: accentColor, color: '#000' }
                                : { borderColor: accentColor, color: accentColor, opacity: 0.5 }
                        }
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [layout, setLayout] = useState<ProfileLayout | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [savedLayout, setSavedLayout] = useState<ProfileLayout | null>(null);
    const [savedProfile, setSavedProfile] = useState<Profile | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        profilesApi.getMe().then(p => {
            setProfile(p);
            setLayout({
                ...p.layout,
                widgets: p.layout?.widgets?.length ? p.layout.widgets : DEFAULT_WIDGETS,
            });
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

    const handleAddWidget = (type: ProfileWidget['type']) => {
        if (!layout) return;
        const newWidget: ProfileWidget = {
            id: `w-${type}-${Date.now()}`,
            type,
            title: WIDGET_OPTIONS.find(o => o.type === type)?.label ?? type,
            content: '',
            order: layout.widgets.length,
        };
        setLayout({ ...layout, widgets: [...layout.widgets, newWidget] });
    };

    const handleEditWidget = (id: string, field: 'title' | 'content', value: string) => {
        if (!layout) return;
        setLayout({
            ...layout,
            widgets: layout.widgets.map(w => w.id === id ? { ...w, [field]: value } : w),
        });
    };

    const handleRemoveWidget = (id: string) => {
        if (!layout) return;
        setLayout({
            ...layout,
            widgets: layout.widgets
                .filter(w => w.id !== id)
                .map((w, i) => ({ ...w, order: i })), // reindex order
        });
    };

    const handleSave = async () => {
        if (!profile || !layout) return;
        setSaving(true);
        await profilesApi.update({
            displayName: profile.displayName,
            animalAvatarUrl: profile.animalAvatarUrl,
            animalType: profile.animalType,
            musicGenres: profile.musicGenres,
            hobbies: profile.hobbies,
            faith: profile.faith ?? undefined,
            politicalLeaning: profile.politicalLeaning ?? undefined,
            layout,
        });
        setSaving(false);
        setSaved(true);
        setSavedLayout(null);
        setSavedProfile(null);
        setEditMode(false);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleProfileChange = (fields: Partial<Profile>) => {
        if (!profile) return;
        setProfile({ ...profile, ...fields });
    };


    if (!profile || !layout) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white opacity-50">
                Loading...
            </div>
        );
    }

    const sortedWidgets = [...layout.widgets].sort((a, b) => a.order - b.order);
    const themeClass = themeClasses[layout.theme] ?? themeClasses.riot;

    return (
        <div className={`min-h-screen ${themeClass} font-mono`}>
            <div className="max-w-2xl mx-auto px-4 py-8">

                {/* ── Top bar ── */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold tracking-widest uppercase" style={{ color: layout.accentColor }}>
                        {editMode ? 'Edit Profile' : 'My Profile'}
                    </h1>
                    <div className="flex gap-2">
                        {editMode ? (
                            <>
                                <button
                                    onClick={() => {
                                        if (savedLayout) setLayout(savedLayout);
                                        if (savedProfile) setProfile(savedProfile);
                                        setEditMode(false);
                                    }}
                                    className="px-4 py-1 rounded-full text-sm border border-white/20 opacity-60 hover:opacity-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-4 py-1 rounded-full text-sm font-bold transition"
                                    style={{ backgroundColor: layout.accentColor, color: '#000' }}
                                >
                                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    setSavedLayout(layout);
                                    setSavedProfile(profile);
                                    setEditMode(true);
                                }}
                                className="px-4 py-1 rounded-full text-sm border transition hover:opacity-100 opacity-70"
                                style={{ borderColor: layout.accentColor, color: layout.accentColor }}
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Avatar & identity ── */}
                <div className="flex items-center gap-5 mb-8">
                    <div
                        className="w-20 h-20 rounded border-2 overflow-hidden flex items-center justify-center text-4xl flex-shrink-0"
                        style={{ borderColor: layout.accentColor }}
                    >
                        {profile.animalAvatarUrl ? (
                            <Image
                                src={profile.animalAvatarUrl}
                                alt={profile.displayName}
                                width={80}
                                height={80}
                                className="object-cover w-full h-full"
                            />
                        ) : '🐾'}
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{profile.displayName}</div>
                        <div className="text-sm opacity-60 capitalize">{profile.animalType}</div>
                        {profile.faith && (
                            <div className="text-xs opacity-40 mt-0.5">{profile.faith}</div>
                        )}
                        {profile.politicalLeaning && (
                            <div className="text-xs opacity-40">{profile.politicalLeaning}</div>
                        )}
                    </div>
                </div>

                {/* ── Edit-only controls: theme + accent ── */}
                {editMode && (
                    <div className="mb-6 flex flex-col gap-4">
                        <div>
                            <div className="text-xs uppercase tracking-widest opacity-50 mb-2">Theme</div>
                            <div className="flex gap-2 flex-wrap">
                                {THEMES.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setLayout({ ...layout, theme: t })}
                                        className={`px-4 py-1 rounded-full text-sm border transition ${layout.theme === t
                                            ? 'border-pink-500 text-pink-400'
                                            : 'border-white/20 opacity-50 hover:opacity-100'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-xs uppercase tracking-widest opacity-50">Accent Color</div>
                            <input
                                type="color"
                                value={layout.accentColor}
                                onChange={e => setLayout({ ...layout, accentColor: e.target.value })}
                                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <span className="text-xs opacity-40">{layout.accentColor}</span>
                        </div>
                    </div>
                )}

                {/* ── Widgets ── */}
                {editMode ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={sortedWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
                            {sortedWidgets.map(widget => (
                                <SortableWidget
                                    key={widget.id}
                                    widget={widget}
                                    accentColor={layout.accentColor}
                                    profile={profile}
                                    onEdit={handleEditWidget}
                                    onRemove={handleRemoveWidget}
                                    onProfileChange={handleProfileChange}
                                />
                            ))}

                        </SortableContext>
                    </DndContext>
                ) : (
                    sortedWidgets.map(widget => (
                        <ViewWidget
                            key={widget.id}
                            widget={widget}
                            profile={profile}
                            accentColor={layout.accentColor}
                        />
                    ))
                )}
                { }
                {editMode && (
                    <AddWidgetBar accentColor={layout.accentColor} onAdd={handleAddWidget} />
                )}
            </div>
        </div>
    );
}