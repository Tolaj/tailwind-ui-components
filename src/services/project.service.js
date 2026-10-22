import mongoose from "mongoose";
import Project from "../models/project.model.js";
import Component from "../models/component.model.js";

const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ""));

/** Finds a project by id or (case-insensitive) name for this user; optionally creates it. */
export async function resolveProject(userId, ref, { create = false } = {}) {
    if (ref === undefined || ref === null || String(ref).trim() === "") return null;
    const value = String(ref).trim();
    if (isId(value)) {
        const byId = await Project.findOne({ _id: value, owner: userId });
        if (byId) return byId;
    }
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byName = await Project.findOne({ owner: userId, name: new RegExp(`^${escaped}$`, "i") });
    if (byName) return byName;
    if (!create) return null;
    return Project.create({ name: value.slice(0, 80), owner: userId });
}

/** Projects with page/section counts. */
export async function listProjects(userId) {
    const projects = await Project.find({ owner: userId }).sort("-updatedAt").lean();
    if (!projects.length) return [];
    const counts = await Component.aggregate([
        { $match: { createdBy: new mongoose.Types.ObjectId(String(userId)), project: { $in: projects.map((p) => p._id) } } },
        { $group: { _id: { project: "$project", kind: "$kind" }, n: { $sum: 1 } } },
    ]);
    const by = {};
    counts.forEach((c) => {
        const k = String(c._id.project);
        by[k] = by[k] || { pages: 0, sections: 0, components: 0 };
        if (c._id.kind === "page") by[k].pages += c.n;
        else if (c._id.kind === "section") by[k].sections += c.n;
        else by[k].components += c.n;
    });
    return projects.map((p) => ({
        id: String(p._id), name: p.name, description: p.description, updatedAt: p.updatedAt,
        pages: by[String(p._id)]?.pages || 0, sections: by[String(p._id)]?.sections || 0, components: by[String(p._id)]?.components || 0,
    }));
}

/** Pages (and loose components) of a project, each with its sections. */
export async function projectTree(userId, projectId) {
    const items = await Component.find({ createdBy: userId, project: projectId })
        .select("title description kind parent order tags version updatedAt")
        .sort("order createdAt")
        .lean();
    const sections = items.filter((i) => i.kind === "section");
    return items
        .filter((i) => i.kind !== "section" || !i.parent || !items.some((p) => String(p._id) === String(i.parent)))
        .map((i) => ({
            id: String(i._id), title: i.title, summary: i.description, kind: i.kind, version: i.version, tags: i.tags || [],
            sections: sections.filter((s) => String(s.parent) === String(i._id)).map((s) => ({ id: String(s._id), title: s.title })),
        }));
}
