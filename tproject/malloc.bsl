#include <"blocks/js" "base.js">
// Source - https://stackoverflow.com/a/63745996
// Posted by Prabhanjan Kumar, modified by community. See post 'Timeline' for change history
// Retrieved 2026-05-28, License - CC BY-SA 4.0
// modified by amy amy (amy) at 2026-07-06

// #define MAX_ALLOCATIONs_ALLOWED       20

// static unsigned char our_memory[0x10000]
list heap = {}

var g_allocted_number = 0
var g_heap_base_address = 0
var MAX_ALLOCATIONs_ALLOWED = 20

list allocation_addr = {}
list allocation_size = {}
gf {
	allocation_addr::clear()
	allocation_addr::clear()
	control_repeat(MAX_ALLOCATIONs_ALLOWED) {
		allocation_addr::push(0)
		allocation_size::push(0)
	}
}

// malloc_info_t   metadata_info[MAX_ALLOCATIONs_ALLOWED] ={0}
var address = 0
var continue_loop = false

// There are three Scenarios We have to Cover

// 1. Continuous Memory allocation: Allocate memory in continuous manner
// 2. Allocated memory between two allocated memory: When Memory is free to allocate in between two allocated memory block. we have to use that memory chunk for allocation.
// 3. Allocated from Initial block When Initial block is free.
fn malloc(size) {
	var j = 0
	var index = 0
	var initial_gap = 0
	var gap = 0
	var flag = false
	var initial_flag = false
	var heap_index = 0
	// malloc_info_t temp_info = {0}

	if(g_allocted_number < MAX_ALLOCATIONs_ALLOWED) {
		continue_loop = true
		for index in g_allocted_number {
			if (continue_loop) {
				if(allocation_addr::at(index+1) != 0 ) {
					initial_gap = allocation_addr::at(1) - g_heap_base_address //Checked Initial Block (Case 3)
					if(initial_gap >= size)
					{
						initial_flag = true
						continue_loop = false
					}
					else
					{
						gap = allocation_addr::at(index+1) - (allocation_addr::at(index) + allocation_size::at(index))  //Check Gap Between two allocated memory (Case 2)
						if(gap >= size)
						{
							flag = true
							continue_loop = false
						}
					}
				}
			}
		}

		//Get Index for allocating memory for case 2
		if(flag == true) {
			heap_index = ((allocation_addr::at(index) + allocation_size::at(index)) - g_heap_base_address)
		
			allocation_addr::remove(index)
			allocation_size::remove(index)
			// for(j = MAX_ALLOCATIONs_ALLOWED -1; j > index+1; j--)
			// {
			// 	memcpy(&metadata_info[j], &metadata_info[j-1], sizeof(malloc_info_t))
			// }
		} else {
			//Get Index for allocating memory for case 3
			if (initial_flag == true) {
				heap_index = 0
				allocation_addr::remove(index)
				allocation_size::remove(index)
				// for(j = MAX_ALLOCATIONs_ALLOWED -1; j > index+1; j--)
				// {
				// 	memcpy(&metadata_info[j], &metadata_info[j-1], sizeof(malloc_info_t))
				// }
			} else {
				//Get Index for allocating memory for case 1
				if(g_allocted_number != 0)
				{
					heap_index = ((allocation_addr::at(index -1) + allocation_size::at(index-1)) - g_heap_base_address)
				} else {
					// 0 th Location of Metadata for First time allocation
					heap_index = 0
				}
			}
		}

		address = heap_index
		allocation_addr::replace(index, g_heap_base_address + heap_index)
		allocation_size::replace(index, size)

		g_allocted_number += 1
		// return address
	}
}

// Source - https://stackoverflow.com/a/63745996
// Posted by Prabhanjan Kumar, modified by community. See post 'Timeline' for change history
// Retrieved 2026-05-28, License - CC BY-SA 4.0

fn free(free_address)
{
	var i = 0
	var copy_meta_data = false
	
	continue_loop = true
	for i in g_allocted_number {
		if (continue_loop) {
			if(free_address == allocation_addr::get(allocation_addr))
			{
				// memset(&our_memory[metadata_info[i].address], 0, metadata_info[i].size)
				g_allocted_number -= 1
				copy_meta_data = true
				// printf("g_allocted_number in free = %d %d\n", g_allocted_number, address)
				continue_loop = false
			}
		}
	}
	
	if(copy_meta_data == true)
	{
		if(i == MAX_ALLOCATIONs_ALLOWED -1)
		{
			allocation_addr::replace(i, 0)
			allocation_size::replace(i, 0)
		}
		else {

		}
			// memcpy(&metadata_info[i], &metadata_info[i+1], sizeof(malloc_info_t))
	}
}

gf {

}
