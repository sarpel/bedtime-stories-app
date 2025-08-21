// Tests for backend/database/db.js core CRUD & queue & sharing
const path = require('path');
const fs = require('fs');

// Use a temp DB per test run
process.env.STORIES_DB_PATH = path.join(__dirname, 'test-stories.db');
process.env.AUDIO_DIR_PATH = path.join(__dirname, 'audio-test');

// Clean leftovers
try { fs.unlinkSync(process.env.STORIES_DB_PATH); } catch { }
try { fs.unlinkSync(process.env.STORIES_DB_PATH + '-shm'); } catch { }
try { fs.unlinkSync(process.env.STORIES_DB_PATH + '-wal'); } catch { }
fs.mkdirSync(process.env.AUDIO_DIR_PATH, { recursive: true });

const storyDb = require('../backend/database/db');

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

exports.create_and_get_story = () => {
    const id = storyDb.createStory('Deneme hikaye', 'test', 'konu');
    assert(id > 0, 'ID > 0 olmalı');
    const st = storyDb.getStory(id);
    assert(st.story_text === 'Deneme hikaye', 'Metin eşleşmeli');
};

exports.update_story = () => {
    const id = storyDb.createStory('A', 'type1', null);
    const ok = storyDb.updateStory(id, 'B', 'type2', 'konu2');
    assert(ok, 'Güncelleme başarılı olmalı');
    const st = storyDb.getStory(id);
    assert(st.story_text === 'B', 'Güncellenmiş metin');
    assert(st.story_type === 'type2', 'Güncellenmiş tip');
};

exports.favorite_story = () => {
    const id = storyDb.createStory('Fav test', 'fav', null);
    const st1 = storyDb.updateStoryFavorite(id, true);
    assert(st1.is_favorite === 1, 'Favori 1 olmalı');
    const st2 = storyDb.updateStoryFavorite(id, false);
    assert(st2.is_favorite === 0, 'Favori 0 olmalı');
};

exports.delete_story = () => {
    const id = storyDb.createStory('Sil test', 'del', null);
    const ok = storyDb.deleteStory(id);
    assert(ok, 'Silme true dönmeli');
    const st = storyDb.getStory(id);
    assert(!st, 'Silindikten sonra bulunmamalı');
};

exports.audio_save_and_get = () => {
    const id = storyDb.createStory('Ses test', 'audio', null);
    const dummyFile = path.join(process.env.AUDIO_DIR_PATH, 'dummy.mp3');
    fs.writeFileSync(dummyFile, 'MP3DATA');
    const audioId = storyDb.saveAudio(id, 'dummy.mp3', dummyFile, 'voice1', { speed: 1 });
    assert(audioId > 0, 'Audio ID > 0');
    const audio = storyDb.getAudioByStoryId(id);
    assert(audio.file_name === 'dummy.mp3', 'Audio dosya adı');
};

exports.story_with_audio = () => {
    const id = storyDb.createStory('Sesli hikaye', 'withaudio', null);
    const dummyFile = path.join(process.env.AUDIO_DIR_PATH, 'd2.mp3');
    fs.writeFileSync(dummyFile, 'DATA');
    storyDb.saveAudio(id, 'd2.mp3', dummyFile, 'v2', { speed: 1 });
    const st = storyDb.getStoryWithAudio(id);
    assert(st.audio && st.audio.file_name === 'd2.mp3', 'Audio iliştirilmiş olmalı');
};

exports.share_and_get_shared = () => {
    const id = storyDb.createStory('Paylaş test', 'share', null);
    const r = storyDb.shareStory(id);
    assert(r.success && r.shareId, 'Share başarılı');
    const shared = storyDb.getStoryByShareId(r.shareId);
    assert(shared && shared.story_text === 'Paylaş test', 'Paylaşılan hikaye bulunmalı');
    const list = storyDb.getAllSharedStories();
    assert(list.find(s => s.share_id === r.shareId), 'Liste içinde paylaşım olmalı');
};

exports.queue_ops = () => {
    const a = storyDb.createStory('Q1', 'q', null);
    const b = storyDb.createStory('Q2', 'q', null);
    storyDb.setQueue([a, b]);
    let q = storyDb.getQueue();
    assert(q.length === 2 && q[0] === a && q[1] === b, 'Kuyruk set');
    storyDb.addToQueue(a); // duplicate ignored
    storyDb.addToQueue(b); // duplicate ignored
    const c = storyDb.createStory('Q3', 'q', null);
    storyDb.addToQueue(c);
    q = storyDb.getQueue();
    assert(q.length === 3, 'Yeni eleman eklendi');
    storyDb.removeFromQueue(b);
    q = storyDb.getQueue();
    assert(!q.includes(b) && q.length === 2, 'Eleman çıkarıldı');
};

exports.unshare_story = () => {
    const id = storyDb.createStory('Unshare', 'share', null);
    const r = storyDb.shareStory(id);
    const ok = storyDb.unshareStory(id);
    assert(ok, 'Unshare başarılı');
    const again = storyDb.getStoryByShareId(r.shareId);
    assert(!again, 'Artık bulunmamalı');
};

exports.list_all_stories = () => {
    const id1 = storyDb.createStory('L1', 'list', null);
    const id2 = storyDb.createStory('L2', 'list', null);
    const all = storyDb.getAllStories();
    assert(all.length >= 2, 'En az 2 hikaye');
    const subset = storyDb.getStoriesByType('list');
    assert(subset.every(s => s.story_type === 'list'), 'Filtre doğru');
};
