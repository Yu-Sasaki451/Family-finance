<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoryRequest;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        return Category::orderBy('id')->get();
    }

    public function store(CategoryRequest $request)
    {
        return Category::create($request->validated());
    }

    public function update(CategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return $category;
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->noContent();
    }
}
