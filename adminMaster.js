async function getNextSortOrder(table) {

    const { data, error } = await supabaseClient
        .from(table)
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);

    if (error) {
        throw error;
    }

    return Number(data?.[0]?.sort_order || 0) + 1;

}